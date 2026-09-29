package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Assets;
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
import com.shatteredpixel.shatteredpixeldungeon.levels.PrisonBossLevel;
import com.shatteredpixel.shatteredpixeldungeon.levels.SewerLevel;
import com.shatteredpixel.shatteredpixeldungeon.levels.Terrain;
import com.shatteredpixel.shatteredpixeldungeon.levels.WallDeco;
import com.shatteredpixel.shatteredpixeldungeon.tiles.DungeonTileSheet;
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

		//Tempelhofer Feld: floor 10 boss arena uses its own tileset (same layout as tiles_prison.png)
		check(Assets.Environment.TILES_TEMPELHOF.equals(new PrisonBossLevel().tilesTex()), "Tengu arena uses Tempelhof tiles");
		check(java.nio.file.Files.exists(java.nio.file.Paths.get("src/main/assets/" + Assets.Environment.TILES_TEMPELHOF)), "Tempelhof tileset exists");
		//Intro sequence: every panel exists and has German and English text
		String scenesDe = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/scenes/scenes_de.properties")), "UTF-8");
		String scenesEn = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/scenes/scenes.properties")), "UTF-8");
		for (int i = 0; i < Assets.Splashes.INTRO.length; i++) {
			check(java.nio.file.Files.exists(java.nio.file.Paths.get("src/main/assets/" + Assets.Splashes.INTRO[i])), "Intro panel " + (i+1));
			check(scenesDe.contains("\nscenes.introscene.page" + (i+1) + "="), "Intro text de " + (i+1));
			check(scenesEn.contains("\nscenes.introscene.page" + (i+1) + "="), "Intro text en " + (i+1));
		}
		for (String key : new String[]{"next", "start", "skip"}) {
			check(scenesDe.contains("\nscenes.introscene." + key + "=") && scenesEn.contains("\nscenes.introscene." + key + "="), "Intro button " + key);
		}

		checkGarderobenmarken();
		checkIntroAudio();
		checkWallDeco();

		System.out.println("Kiez smoke checks passed: classes, shops, spawns, gas save/release, courtyard, scooter lanes, deposit shards, appointment reseller, jackhammer, luxury fences, house rules, bass drop, Tempelhof arena, intro sequence, wall motif texts.");
	}

	//Intro: sound bed files exist as Ogg Vorbis, and the intro runs before every new game (no seen-once gate)
	private static void checkIntroAudio() throws Exception {
		for (String track : new String[]{Assets.Music.INTRO_1, Assets.Music.INTRO_2, Assets.Music.INTRO_3,
				Assets.Music.INTRO_4, Assets.Music.INTRO_KELLER}) {
			java.nio.file.Path path = java.nio.file.Paths.get("src/main/assets/" + track);
			check(java.nio.file.Files.exists(path), "Intro audio exists: " + track);
			byte[] data = java.nio.file.Files.readAllBytes(path);
			check(data.length > 50_000 && data[0] == 'O' && data[1] == 'g' && data[2] == 'g' && data[3] == 'S',
					"Intro audio is Ogg: " + track);
		}
		check(com.shatteredpixel.shatteredpixeldungeon.scenes.IntroScene.showBeforeNewGame(), "Intro before every new game");
		String heroSelect = new String(java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(
				"src/main/java/com/shatteredpixel/shatteredpixeldungeon/scenes/HeroSelectScene.java")), "UTF-8");
		check(!heroSelect.contains("introSequenceSeen"), "Intro trigger does not depend on the seen flag");
		int starts = heroSelect.split("IntroScene.startNewGame\\(\\)", -1).length - 1;
		check(starts == 2, "Normal/seeded and daily start both go through the intro (" + starts + ")");
	}

	//Club-Labyrinth (VaultLevel): exactly 7 Garderobenmarken per level, roaming guests carry none, cloakroom needs 7
	private static void checkGarderobenmarken() throws Exception {
		check(com.shatteredpixel.shatteredpixeldungeon.items.quest.DwarfToken.VAULT_REQUIRED == 7, "Cloakroom needs 7 tokens");
		com.shatteredpixel.shatteredpixeldungeon.actors.hero.Hero oldHero = Dungeon.hero;
		int oldDepth = Dungeon.depth, oldBranch = Dungeon.branch;
		long oldSeed = Dungeon.seed;
		Dungeon.hero = new Hero();
		Dungeon.hero.heroClass = HeroClass.WARRIOR;
		Dungeon.hero.lvl = 20;
		Dungeon.depth = 17;
		Dungeon.branch = 1;
		Dungeon.seed = 17;
		//full level generation needs textures, so check the room plan: one token per treasure room, 7 treasure rooms
		Method initRooms = com.shatteredpixel.shatteredpixeldungeon.levels.VaultLevel.class.getDeclaredMethod("initRooms");
		initRooms.setAccessible(true);
		for (long seed = 1; seed <= 5; seed++) {
			com.watabou.utils.Random.pushGenerator(seed);
			com.shatteredpixel.shatteredpixeldungeon.levels.VaultLevel club = new com.shatteredpixel.shatteredpixeldungeon.levels.VaultLevel();
			int treasureRooms = 0;
			for (Object room : (List<?>) initRooms.invoke(club)) {
				if (room instanceof com.shatteredpixel.shatteredpixeldungeon.levels.rooms.quest.vault.treasure.VaultTreasureRoom) treasureRooms++;
			}
			check(treasureRooms == com.shatteredpixel.shatteredpixeldungeon.items.quest.DwarfToken.VAULT_REQUIRED,
					"Club plan (seed " + seed + ") has 7 token rooms, found " + treasureRooms);
			for (int i = 0; i < 12; i++) {
				Mob guest = club.createMob();
				check(Dungeon.hero.lvl > guest.maxLvl + 2 && 1 > guest.maxLvl + 2, "Roaming club guest drops no token: " + guest.getClass().getSimpleName());
				Bundle guestSave = new Bundle();
				guest.storeInBundle(guestSave);
				Mob guestRestored = (Mob) com.watabou.utils.Reflection.newInstance(guest.getClass());
				guestRestored.restoreFromBundle(guestSave);
				check(guestRestored.maxLvl == guest.maxLvl, "No-token flag survives save/load");
			}
			com.watabou.utils.Random.popGenerator();
		}
		//treasure room guards are created directly and still carry their room's token
		Mob guard = new com.shatteredpixel.shatteredpixeldungeon.actors.mobs.quest.vault.VaultShaman();
		check(guard.loot == com.shatteredpixel.shatteredpixeldungeon.items.quest.DwarfToken.class && Dungeon.hero.lvl <= guard.maxLvl + 2, "Treasure guard keeps token");
		com.shatteredpixel.shatteredpixeldungeon.items.quest.DwarfToken marks = new com.shatteredpixel.shatteredpixeldungeon.items.quest.DwarfToken();
		marks.quantity(3);
		Bundle marksSave = new Bundle();
		marksSave.put("marks", marks);
		check(((com.shatteredpixel.shatteredpixeldungeon.items.Item) marksSave.get("marks")).quantity() == 3, "Token progress survives save/load");
		String itemsDe = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/items/items_de.properties")), "UTF-8");
		String levelsDe = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/levels/levels_de.properties")), "UTF-8");
		for (String key : new String[]{"progress", "complete"}) {
			check(itemsDe.contains("\nitems.quest.dwarftoken." + key + "="), "Token text " + key);
		}
		check(levelsDe.contains("\nlevels.vaultlevel.intro_title=") && levelsDe.contains("\nlevels.vaultlevel.intro_text="), "Club intro text");
		Dungeon.hero = oldHero;
		Dungeon.depth = oldDepth;
		Dungeon.branch = oldBranch;
		Dungeon.seed = oldSeed;
	}

	//Wall motifs: the examine text follows the drawn raised-wall variant (same selection as DungeonTileSheet),
	//every motif has art in its region atlas and a name + description in German and English
	private static void checkWallDeco() throws Exception {
		Level oldLevel = Dungeon.level;
		String levelsDe = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/levels/levels_de.properties")), "UTF-8");
		String levelsEn = new String(java.nio.file.Files.readAllBytes(
				java.nio.file.Paths.get("src/main/assets/messages/levels/levels.properties")), "UTF-8");
		for (String key : WallDeco.KEYS) {
			for (String k : new String[]{key, key + "_name"}) {
				check(levelsDe.contains("\nlevels.walldeco." + k + "="), "Wall motif text de " + k);
				check(levelsEn.contains("\nlevels.walldeco." + k + "="), "Wall motif text en " + k);
			}
		}
		//fixed assignments the owner asked about: März only on one wall end per region, and only in two regions
		String[] sheets = {Assets.Environment.TILES_SEWERS, Assets.Environment.TILES_PRISON, Assets.Environment.TILES_CAVES,
				Assets.Environment.TILES_CITY, Assets.Environment.TILES_HALLS};
		String[] notice = {"gesuch_1", "gesuch_2", "gesuch_3", "graffiti_kiez", "graffiti_taube"};
		int maerzVisuals = 0;
		for (int region = 0; region < sheets.length; region++) {
			java.awt.image.BufferedImage atlas = javax.imageio.ImageIO.read(new java.io.File("src/main/assets/" + sheets[region]));
			check(WallDeco.region(sheets[region]) == region, "Region of " + sheets[region]);
			for (int visual = DungeonTileSheet.RAISED_WALL; visual < DungeonTileSheet.RAISED_WALL + 32; visual++) {
				String key = WallDeco.motifFor(region, visual);
				if (key == null) continue;
				check(Arrays.asList(WallDeco.KEYS).contains(key), "Known wall motif " + key);
				if (key.startsWith("maerz")) maerzVisuals++;
				//a motif cell must look different from the plain wall face with the same wall end
				//(the Hinterhof shopfronts sit on the plain wall ends themselves and are skipped)
				int plain = DungeonTileSheet.RAISED_WALL + (visual - DungeonTileSheet.RAISED_WALL) % 4;
				if (plain == visual) continue;
				int diff = 0;
				for (int y = 4; y < 16; y++) for (int x = 0; x < 16; x++) {
					if (atlas.getRGB((visual % 16) * 16 + x, (visual / 16) * 16 + y) != atlas.getRGB((plain % 16) * 16 + x, (plain / 16) * 16 + y)) diff++;
				}
				check(diff >= 6, "Motif " + key + " is drawn in " + sheets[region] + " cell " + visual);
			}
			for (int end = 0; end < 4; end++) {
				check(notice[region].equals(WallDeco.motifFor(region, DungeonTileSheet.RAISED_WALL_NOTICE + end)), "Notice motif " + region + "+" + end);
			}
		}
		check(maerzVisuals == 2, "März appears on exactly two wall variants, found " + maerzVisuals);
		check("maerz_1".equals(WallDeco.motifFor(WallDeco.HINTERHOF, DungeonTileSheet.RAISED_WALL_ALT + 1))
				&& "graffiti_miete".equals(WallDeco.motifFor(WallDeco.HINTERHOF, DungeonTileSheet.RAISED_WALL_ALT + 2))
				&& "maerz_2".equals(WallDeco.motifFor(WallDeco.AMT, DungeonTileSheet.RAISED_WALL_ALT + 2))
				&& "graffiti_herz".equals(WallDeco.motifFor(WallDeco.AMT, DungeonTileSheet.RAISED_WALL_DECO_ALT)),
				"Wall motif assignments");

		//only the regular floors of the five regions get the notice variant and motif texts
		check(WallDeco.enabled(new SewerLevel()) && WallDeco.enabled(new com.shatteredpixel.shatteredpixeldungeon.levels.HallsLevel()),
				"Regular floors use wall motifs");
		check(!WallDeco.enabled(new PrisonBossLevel()) && !WallDeco.enabled(new com.shatteredpixel.shatteredpixeldungeon.levels.VaultLevel())
				&& !WallDeco.enabled(new com.shatteredpixel.shatteredpixeldungeon.levels.CityBossLevel()),
				"Tempelhof arena, boss arenas and the club keep plain walls");

		//a long wall face above open floor: every face cell's motif matches its drawn variant
		Level[] levels = {new SewerLevel(), new com.shatteredpixel.shatteredpixeldungeon.levels.PrisonLevel(),
				new com.shatteredpixel.shatteredpixeldungeon.levels.CavesLevel(), new com.shatteredpixel.shatteredpixeldungeon.levels.CityLevel(),
				new com.shatteredpixel.shatteredpixeldungeon.levels.HallsLevel()};
		for (int region = 0; region < levels.length; region++) {
			Level wall = levels[region];
			int w = 40, h = 40;
			wall.setSize(w, h);
			for (int i = 0; i < w * h; i++) wall.map[i] = Terrain.WALL;
			for (int y = 2; y < h - 1; y += 3) {
				for (int x = 1; x < w - 1; x++) wall.map[x + y * w] = (x % 13 == 0) ? Terrain.WALL : Terrain.EMPTY;
				wall.map[5 + (y - 1) * w] = Terrain.WALL_DECO;
			}
			Dungeon.level = wall;
			DungeonTileSheet.setupVariance(w * h, 1234 + region);
			int faces = 0, notices = 0, plainChecked = 0;
			for (int cell = w; cell < w * h - w; cell++) {
				int visual = WallDeco.visual(wall, cell);
				if (visual < 0) continue;
				faces++;
				String key = WallDeco.motif(wall, cell);
				check(java.util.Objects.equals(key, WallDeco.motifFor(region, visual)), "Motif follows the drawn variant at " + cell);
				if (visual >= DungeonTileSheet.RAISED_WALL_NOTICE && visual < DungeonTileSheet.RAISED_WALL_NOTICE + 4) {
					notices++;
					check(DungeonTileSheet.tileVariance[cell] < WallDeco.NOTICE_CHANCE, "Notice only below the notice chance");
					check(notice[region].equals(key), "Notice cell shows the region notice");
				} else if (wall.map[cell] == Terrain.WALL && DungeonTileSheet.tileVariance[cell] >= 50) {
					plainChecked++;
				}
			}
			check(faces > 300 && notices > 0 && notices < faces / 8 && plainChecked > 0,
					"Notice share in " + sheets[region] + ": " + notices + " of " + faces);
		}
		//outside the five regions (Tempelhof arena) the notice cells are never chosen
		Level arena = new PrisonBossLevel();
		arena.setSize(20, 20);
		for (int i = 0; i < 400; i++) arena.map[i] = (i / 20) % 2 == 0 ? Terrain.WALL : Terrain.EMPTY;
		Dungeon.level = arena;
		DungeonTileSheet.setupVariance(400, 99);
		for (int cell = 20; cell < 380; cell++) {
			int visual = WallDeco.visual(arena, cell);
			check(visual < DungeonTileSheet.RAISED_WALL_NOTICE || visual >= DungeonTileSheet.RAISED_WALL_NOTICE + 4, "No notices in the Tempelhof arena");
			check(WallDeco.motif(arena, cell) == null, "No motif texts in the Tempelhof arena");
		}
		Dungeon.level = oldLevel;
		DungeonTileSheet.tileVariance = null;
	}
}
