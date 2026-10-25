import { act } from "react";
import { Settings } from "osrs-sdk";
import { OcellusRegion } from "../js/OcellusRegion";
import { UNDER_BOSS, clickTile } from "./drill";
import { loadPage } from "./page";

const POLL_WAIT_MS = 200;

type ShownBar = Readonly<{ name: string | null; value: string | null; fill: string }>;

async function shownBar(): Promise<ShownBar | null> {
  await act(() => new Promise((resolve) => setTimeout(resolve, POLL_WAIT_MS)));
  const bar = document.querySelector("#boss_health");
  if (!bar) return null;
  const fill = bar.querySelector<HTMLElement>("#boss_health_fill");
  if (!fill) throw new Error("the boss health bar has no fill");
  return {
    name: bar.querySelector("#boss_health_name")?.textContent ?? null,
    value: bar.querySelector("#boss_health_value")?.textContent ?? null,
    fill: fill.style.width,
  };
}

async function openFight(url: string) {
  // The page builds its own region; the call-through spy hands the test that instance so it can tick the world the SDK loop would.
  const built = vi.spyOn(OcellusRegion.prototype, "initialiseRegion");
  const page = loadPage(url);
  const region = built.mock.contexts.at(-1);
  built.mockRestore();
  if (!(region instanceof OcellusRegion)) throw new Error("the page built no region");
  await act(() => Promise.resolve());
  const tickTo = (p4Tick: number) => {
    for (let guard = 0; guard < 400; guard++) {
      const run = region.snapshot()?.run;
      if (run?.kind === "ended" || (run?.kind === "running" && run.tick >= p4Tick)) return;
      region.world.tickWorld();
    }
    throw new Error(`the run never reached P4 tick ${p4Tick}`);
  };
  return { page, region, tickTo };
}

describe("Boss health bar", () => {
  beforeEach(() => localStorage.setItem("osrs-sdk:settings", JSON.stringify({ version: 1, values: { use3dView: false } })));

  test("shows Ocellus's hitpoints and shuts the SDK's own bar off", async () => {
    const { page, region, tickTo } = await openFight("/?seed=100&bosshp=50");
    const before = await shownBar();
    tickTo(8);
    await clickTile(region.world, UNDER_BOSS);
    tickTo(20);
    const after = await shownBar();
    page.close();

    expect({ sdkBar: Settings.displayBossHealthBar, before, after }).toEqual({
      sdkBar: false,
      before: { name: "Ocellus", value: "50 / 5250 (1.0%)", fill: "1%" },
      after: { name: "Ocellus", value: "0 / 5250 (0.0%)", fill: "0%" },
    });
  });
});
