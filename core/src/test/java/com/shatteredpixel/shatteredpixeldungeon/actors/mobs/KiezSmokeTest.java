package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Bauzaun;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Blob;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Scherben;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.ToxicGas;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Hausregel;
import com.shatteredpixel.shatteredpixeldungeon.actors.hero.ExpatIncantations;
import com.shatteredpixel.shatteredpixeldungeon.actors.hero.Hero;
import com.shatteredpixel.shatteredpixeldungeon.actors.hero.HeroClass;
import com.shatteredpixel.shatteredpixeldungeon.items.wands.WandOfBlastWave;
import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.levels.SewerLevel;
import com.shatteredpixel.shatteredpixeldungeon.levels.Terrain;
import com.shatteredpixel.shatteredpixeldungeon.levels.rooms.standard.HinterhofRoom;
import com.watabou.utils.Bundle;
import com.watabou.utils.SparseArray;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.HashMap;
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
			check(mobs.contains(EScooter.class) == (depth >= 2), "Scooter at " + depth);
			check(mobs.contains(Pfandgolem.class) == (depth >= 3), "Deposit golem at " + depth);
		}

		for (int depth = 6; depth <= 10; depth++) {
			List<?> mobs = (List<?>) rotation.invoke(null, depth);
			check(mobs.contains(Terminhaendler.class), "Appointment reseller at " + depth);
		}

		for (int depth = 11; depth <= 15; depth++) {
			List<?> mobs = (List<?>) rotation.invoke(null, depth);
			check(mobs.contains(Presslufter.class), "Jackhammer worker at " + depth);
			check(mobs.contains(Technojuenger.class), "Afterhour raver at " + depth);
		}

		for (int depth = 16; depth <= 20; depth++) {
			List<?> mobs = (List<?>) rotation.invoke(null, depth);
			check(mobs.contains(Luxussanierer.class), "Luxury developer at " + depth);
		}

		for (int depth = 21; depth <= 25; depth++) {
			List<?> mobs = (List<?>) rotation.invoke(null, depth);
			check(mobs.contains(HausordnungsHydra.class), "House rules hydra at " + depth);
		}
		check(Hausregel.violates(Hausregel.QUIET, 10, 11) && !Hausregel.violates(Hausregel.QUIET, 10, 10),
				"Quiet hours fine movement only");
		check(Hausregel.violates(Hausregel.SWEEP, 10, 10) && !Hausregel.violates(Hausregel.SWEEP, 10, 11),
				"Sweeping duty fines standing still only");
		HausordnungsHydra hydra = new HausordnungsHydra();
		check(hydra.announce() == Hausregel.QUIET && hydra.announce() == Hausregel.SWEEP
				&& hydra.announce() == Hausregel.QUIET, "Rules alternate");
		Bundle hydraSave = new Bundle();
		hydra.storeInBundle(hydraSave);
		HausordnungsHydra hydraRestored = new HausordnungsHydra();
		hydraRestored.restoreFromBundle(hydraSave);
		check(hydraRestored.announce() == Hausregel.SWEEP, "Next rule survives save/load");

		check(Level.Feeling.region(1) == 1 && Level.Feeling.region(5) == 1 && Level.Feeling.region(6) == 2
				&& Level.Feeling.region(25) == 5 && Level.Feeling.region(26) == 5, "Feeling regions");

		//Messages needs a running app, so read the German bundle directly (working dir: core/)
		String actorsDe = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/actors/actors_de.properties")), "UTF-8");
		for (int i = 0; i < ExpatIncantations.LINES; i++) {
			check(actorsDe.contains("\nactors.hero.expatincantations.line_" + i + "="), "Expat line " + i);
		}
		Hero local = new Hero();
		local.heroClass = HeroClass.WARRIOR;
		check(WandOfBlastWave.knockbackPower(local, 4) == 2, "Alteingesessene: half knockback");
		local.heroClass = HeroClass.ROGUE;
		check(WandOfBlastWave.knockbackPower(local, 4) == 4, "Tourist: full knockback");

		check(Dungeon.debugStartDepth(false, "11") == 1, "Release builds always start on depth 1");
		check(Dungeon.debugStartDepth(true, "11") == 11 && Dungeon.debugStartDepth(true, "99") == 26
				&& Dungeon.debugStartDepth(true, "abc") == 1 && Dungeon.debugStartDepth(true, null) == 1,
				"Debug start depth is parsed and clamped");

		Dungeon.depth = 2;
		SewerLevel level = new SewerLevel();
		level.setSize(12, 12);
		level.blobs = new HashMap<>();
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

		//open 10x10 floor inside a 12x12 wall ring, one pillar at (8,5)
		for (int x = 1; x <= 10; x++) {
			for (int y = 1; y <= 10; y++) {
				level.map[x + y * 12] = Terrain.EMPTY;
			}
		}
		level.map[8 + 5 * 12] = Terrain.WALL;
		level.buildFlagMaps();
		int scooterPos = 2 + 5 * 12;
		check(EScooter.inLane(level, scooterPos, 5 + 5 * 12), "Row lane in range");
		check(EScooter.inLane(level, scooterPos, 5 + 8 * 12), "Diagonal lane in range");
		check(!EScooter.inLane(level, scooterPos, 3 + 5 * 12), "Adjacent is too close for a run-up");
		check(!EScooter.inLane(level, scooterPos, 5 + 6 * 12), "Knight-move offset is not a lane");
		check(!EScooter.inLane(level, scooterPos, 9 + 5 * 12), "Pillar blocks the lane");
		List<Integer> lane = EScooter.lane(scooterPos, 4 + 5 * 12);
		check(lane.size() == 5 && lane.get(4) == 7 + 5 * 12, "Charge rolls past target and stops before the pillar");
		List<Integer> longLane = EScooter.lane(1 + 1 * 12, 1 + 3 * 12);
		check(longLane.size() == EScooter.CHARGE_LENGTH, "Charge length is capped");

		EScooter scooter = new EScooter();
		scooter.pos = scooterPos;
		Bundle scooterSave = new Bundle();
		scooter.storeInBundle(scooterSave);
		scooterSave.put("charge_target", 5 + 5 * 12);
		EScooter scooterRestored = new EScooter();
		scooterRestored.restoreFromBundle(scooterSave);
		Bundle scooterAfter = new Bundle();
		scooterRestored.storeInBundle(scooterAfter);
		check(scooterAfter.getInt("charge_target") == 5 + 5 * 12, "Announced charge survives save/load");

		Pfandgolem.shatter(5 + 2 * 12);
		Scherben shards = (Scherben) level.blobs.get(Scherben.class);
		check(shards != null && shards.cur[5 + 2 * 12] == Scherben.DURATION, "Shards on golem tile");
		check(shards.cur[6 + 3 * 12] == Scherben.DURATION, "Shards on walkable neighbour");
		check(shards.cur[5] == 0, "No shards inside walls");
		check(level.avoid[5 + 2 * 12], "Shards are flagged like a visible trap");
		for (int turn = 0; turn < Scherben.DURATION; turn++) shards.act();
		check(shards.volume == 0 && !level.avoid[5 + 2 * 12], "Shards fade after their duration");

		List<Integer> pound = Presslufter.poundCells(2 + 5 * 12);
		check(pound.size() == 8, "Open floor: all 8 neighbours are pounded");
		check(Presslufter.poundCells(7 + 5 * 12).size() == 7 && !Presslufter.poundCells(7 + 5 * 12).contains(8 + 5 * 12),
				"Walls are never marked");
		check(Presslufter.poundCells(1 + 1 * 12).size() == 3, "Corner: only walkable neighbours");
		Presslufter worker = new Presslufter();
		Bundle workerSave = new Bundle();
		worker.storeInBundle(workerSave);
		workerSave.put("revving", true);
		Presslufter workerRestored = new Presslufter();
		workerRestored.restoreFromBundle(workerSave);
		Bundle workerAfter = new Bundle();
		workerRestored.storeInBundle(workerAfter);
		check(workerAfter.getBoolean("revving"), "Announced pound survives save/load");

		level.heaps = new SparseArray<>();
		level.traps = new SparseArray<>();
		//builder at (2,2), target at (5,2): escape tiles are the column x=6
		List<Integer> fence = Luxussanierer.fenceCells(level, 2 + 2 * 12, 5 + 2 * 12);
		check(fence.size() == 3 && fence.contains(6 + 1 * 12) && fence.contains(6 + 2 * 12) && fence.contains(6 + 3 * 12),
				"Fence plan covers only the escape side");
		Blob.seed(6 + 2 * 12, Bauzaun.DURATION, Bauzaun.class);
		Bauzaun fences = (Bauzaun) level.blobs.get(Bauzaun.class);
		check(level.map[6 + 2 * 12] == Terrain.BARRICADE && level.solid[6 + 2 * 12], "Fence is a solid barricade");
		Blob.seed(8 + 5 * 12, Bauzaun.DURATION, Bauzaun.class);
		check(level.map[8 + 5 * 12] == Terrain.WALL, "Walls are never fenced");
		for (int turn = 0; turn < Bauzaun.DURATION; turn++) fences.act();
		check(level.map[6 + 2 * 12] == Terrain.EMPTY && level.passable[6 + 2 * 12], "Fence is removed after its duration");
		Luxussanierer builder = new Luxussanierer();
		Bundle builderSave = new Bundle();
		builder.storeInBundle(builderSave);
		builderSave.put("planned", new int[]{6 + 1 * 12, 6 + 2 * 12});
		Luxussanierer builderRestored = new Luxussanierer();
		builderRestored.restoreFromBundle(builderSave);
		Bundle builderAfter = new Bundle();
		builderRestored.storeInBundle(builderAfter);
		check(builderAfter.getIntArray("planned").length == 2, "Announced fences survive save/load");

		check(Technojuenger.dropCells(level, 2 + 5 * 12).size() == 19, "Drop covers walkable tiles within 2 (walls excluded)");
		check(Technojuenger.pushOffset(level, 5 + 5 * 12, 7 + 3 * 12) == 1 - 12, "Push points away from the raver");
		Technojuenger raver = new Technojuenger();
		check(raver.state == raver.WANDERING, "Afterhour: never spawns asleep");
		Bundle raverSave = new Bundle();
		raver.storeInBundle(raverSave);
		raverSave.put("dropping", true);
		Technojuenger raverRestored = new Technojuenger();
		raverRestored.restoreFromBundle(raverSave);
		Bundle raverAfter = new Bundle();
		raverRestored.storeInBundle(raverAfter);
		check(raverAfter.getBoolean("dropping"), "Announced drop survives save/load");

		Terminhaendler reseller = new Terminhaendler();
		reseller.state = reseller.FLEEING;
		Bundle resellerSave = new Bundle();
		reseller.storeInBundle(resellerSave);
		resellerSave.put("retreat", 2);
		Terminhaendler resellerRestored = new Terminhaendler();
		resellerRestored.restoreFromBundle(resellerSave);
		check(!resellerRestored.tickRetreat() && resellerRestored.state == resellerRestored.FLEEING, "Retreat keeps running");
		check(resellerRestored.tickRetreat() && resellerRestored.state == resellerRestored.HUNTING, "Retreat ends and hunt resumes");
		Terminhaendler scared = new Terminhaendler();
		scared.state = scared.FLEEING;
		check(!scared.tickRetreat() && scared.state == scared.FLEEING, "Fear without own retreat is left alone");

		System.out.println("Kiez smoke checks passed: classes, shops, spawns, gas save/release, courtyard, scooter lanes, deposit shards, appointment reseller, jackhammer, luxury fences, house rules, bass drop.");
	}
}
