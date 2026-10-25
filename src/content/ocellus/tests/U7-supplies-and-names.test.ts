import type { Item } from "osrs-sdk";
import { startDrill } from "./drill";

type Drill = ReturnType<typeof startDrill>;

const menu = (drill: Drill, item: Item): string[] => item.contextActions(drill.player()).map((option) => option.text.map((block) => `${block.text}`).join(""));
const hovers = (drill: Drill): string[] => drill.player().inventory.flatMap((item) => (item ? [menu(drill, item)[0]] : []));

describe("U7 item names and supplies", () => {
  test("every item the ranged setup carries or wears shows its name in the inventory menu", () => {
    const drill = startDrill({ selection: { setup: "ranged" } });
    const carried = hovers(drill);
    const helm = drill.player().inventory[4];
    const helmMenu = helm ? menu(drill, helm) : [];
    for (const item of [...drill.player().inventory]) {
      if (item !== null && item.cacheItemId !== 28922 && menu(drill, item)[0]?.startsWith("Equip")) item.inventoryLeftClick(drill.player());
    }
    const switchedOut = hovers(drill);
    drill.dispose();

    expect(helmMenu).toEqual(["Equip Inquisitor's great helm", "Drop Inquisitor's great helm", "Examine Inquisitor's great helm"]);
    expect(new Set(carried.filter((name) => name.startsWith("Drink")))).toEqual(new Set(["Drink Super combat potion", "Drink Bastion Potion", "Drink Saradomin Brew", "Drink Super Restore"]));
    expect(carried.slice(0, 13)).toEqual([
      "Equip Scythe of Vitur",
      "Equip Ferocious gloves",
      "Drink Super combat potion",
      "Equip Tonalztics of Ralos",
      "Equip Inquisitor's great helm",
      "Equip Infernal cape",
      "Drink Bastion Potion",
      "Drink Saradomin Brew",
      "Equip Inquisitor's hauberk",
      "Equip Amulet of rancour",
      "Drink Super Restore",
      "Drink Super combat potion",
      "Equip Inquisitor's plateskirt",
    ]);
    expect(switchedOut.slice(0, 13)).toEqual([
      "Equip Twisted Bow",
      "Equip Zaryte Vambraces",
      "Drink Super combat potion",
      "Equip Tonalztics of Ralos",
      "Equip Masori mask (f)",
      "Equip Dizana's Quiver",
      "Drink Bastion Potion",
      "Drink Saradomin Brew",
      "Equip Masori body (f)",
      "Equip Necklace of rupture",
      "Drink Super Restore",
      "Drink Super combat potion",
      "Equip Masori chaps (f)",
    ]);
  });

  test("a carried Saradomin brew heals 16 the tick after the click, and a super restore waits out the 3-tick potion delay", () => {
    const drill = startDrill();
    const player = drill.player();
    player.currentStats.prayer = 50;
    const carried = (cacheItemId: number) => player.inventory.find((item) => item?.cacheItemId === cacheItemId);
    carried(6685)?.inventoryLeftClick(player);
    const afterEachTick: number[][] = [];
    for (let tick = 0; tick < 4; tick++) {
      carried(3024)?.inventoryLeftClick(player);
      drill.region.world.tickWorld();
      afterEachTick.push([player.currentStats.hitpoint, player.currentStats.prayer, player.currentStats.range]);
    }
    drill.dispose();

    expect(afterEachTick).toEqual([
      [115, 50, 88],
      [115, 50, 88],
      [115, 50, 88],
      [115, 84, 99],
    ]);
  });
});
