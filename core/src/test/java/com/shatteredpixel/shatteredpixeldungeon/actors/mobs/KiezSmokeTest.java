package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.ToxicGas;
import com.shatteredpixel.shatteredpixeldungeon.actors.hero.HeroClass;
import com.shatteredpixel.shatteredpixeldungeon.levels.SewerLevel;
import com.shatteredpixel.shatteredpixeldungeon.levels.Terrain;
import com.shatteredpixel.shatteredpixeldungeon.levels.rooms.standard.HinterhofRoom;
import com.watabou.utils.Bundle;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

/** Runs without graphics or an external test framework. */
public class KiezSmokeTest {
	private static void check(boolean valid, String message) {
		if (!valid) throw new AssertionError(message);
	}

	public static void main(String[] args) throws Exception {
		com.watabou.noosa.Game.version = "test";
		check(Arrays.equals(HeroClass.kiezClasses(), new HeroClass[]{HeroClass.WARRIOR,
				HeroClass.MAGE, HeroClass.HUNTRESS, HeroClass.ROGUE}), "Four intended classes");
		for (HeroClass heroClass : HeroClass.kiezClasses()) {
			check(heroClass.isUnlocked(), "Unlocked: " + heroClass);
		}
		for (int depth = 1; depth <= 25; depth++) {
			Dungeon.depth = depth;
			check(Dungeon.shopOnLevel() == (depth == 6 || depth == 11 || depth == 16),
					"Shop schedule at " + depth);
		}
		Method rotation = MobSpawner.class.getDeclaredMethod("standardMobRotation", int.class);
		rotation.setAccessible(true);
		for (int depth = 1; depth <= 4; depth++) {
			List<?> mobs = (List<?>) rotation.invoke(null, depth);
			check(mobs.contains(GasAlchemist.class) == (depth >= 2), "Gas enemy at " + depth);
		}

		Dungeon.depth = 2;
		SewerLevel level = new SewerLevel();
		level.setSize(12, 12);
		Dungeon.level = level;
		GasAlchemist source = new GasAlchemist();
		source.pos = 65;
		source.state = source.HUNTING;
		Bundle saved = new Bundle();
		source.storeInBundle(saved);
		saved.put("venting", true);
		saved.put("vent_cooldown", 0);
		GasAlchemist restored = new GasAlchemist();
		restored.restoreFromBundle(saved);
		check(restored.state == restored.HUNTING, "Hunting state restored");
		check(restored.isImmune(ToxicGas.class), "Immune to own cloud");
		restored.state.act(false, false);
		ToxicGas gas = (ToxicGas) level.blobs.get(ToxicGas.class);
		check(gas != null && gas.cur[65] == 24, "Pending cloud released at saved position");
		Bundle after = new Bundle();
		restored.storeInBundle(after);
		check(!after.getBoolean("venting") && after.getInt("vent_cooldown") == 6,
				"Release consumes warning and starts cooldown");

		HinterhofRoom room = new HinterhofRoom();
		room.set(1, 1, 10, 10);
		room.paint(level);
		check(level.map[5 + 5 * 12] == Terrain.EMPTY_SP, "Paved courtyard center");
		check(level.map[3 + 3 * 12] == Terrain.WATER, "Courtyard puddle");
		check(level.map[2 + 5 * 12] == Terrain.EMPTY, "Clear path around courtyard");
		System.out.println("Kiez smoke checks passed: classes, shops, spawns, gas save/release, courtyard.");
	}
}
