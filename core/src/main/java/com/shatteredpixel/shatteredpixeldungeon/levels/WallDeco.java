/* Licensed under the GNU General Public License, version 3 or later. */
package com.shatteredpixel.shatteredpixeldungeon.levels;

import com.shatteredpixel.shatteredpixeldungeon.Assets;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.tiles.DungeonTileSheet;

/**
 * Wall motifs of the five region tilesets (posters, graffiti, flat-hunt notes, shopfronts,
 * lamps). The motif of a wall cell is read from the same raised-wall visual the terrain
 * tilemap draws (DungeonTileSheet.getRaisedWallTile with the level's tile variance), so the
 * examine text always matches the picture. Art: tools/generate-*-tiles.cjs,
 * docs/NEUKOELLN-ART-TILES.md. Texts: levels.walldeco.KEY and levels.walldeco.KEY_name.
 */
public class WallDeco {

	/** Percent of plain raised wall faces that show the RAISED_WALL_NOTICE variant. */
	public static final float NOTICE_CHANCE = 5f;

	private static final String[] SHEETS = {
			Assets.Environment.TILES_SEWERS, Assets.Environment.TILES_PRISON, Assets.Environment.TILES_CAVES,
			Assets.Environment.TILES_CITY, Assets.Environment.TILES_HALLS
	};
	public static final int HINTERHOF = 0, AMT = 1, BAUSTELLE = 2, RENDITE = 3, RATHAUS = 4;

	/** Every motif key, for checks: each needs a _name and a description in both languages. */
	public static final String[] KEYS = {
			"shisha", "konditorei", "barbershop", "fallrohr", "maerz_1", "graffiti_miete", "flyer_baerg", "gesuch_1",
			"amtslampe", "graffiti_herz", "feuerloescher", "maerz_2", "notausgang", "gesuch_2",
			"plakat_baerg", "graffiti_kran", "gesuch_3",
			"lueftung", "kamera", "messingschild", "graffiti_vermieten", "graffiti_kiez",
			"paternoster", "graffiti_wegda", "graffiti_taube"
	};

	/**
	 * Regular floors of the five regions (and their shop/boss floors that are RegularLevels).
	 * Boss arenas with custom wall visuals, the Tempelhof arena, the mining and club branches
	 * keep the plain wall variants and the old texts.
	 */
	public static boolean enabled(Level level) {
		return level instanceof RegularLevel
				&& !(level instanceof MiningLevel)
				&& !(level instanceof VaultLevel)
				&& region(level.tilesTex()) >= 0;
	}

	public static int region(String tilesTex) {
		for (int i = 0; i < SHEETS.length; i++) {
			if (SHEETS[i].equals(tilesTex)) return i;
		}
		return -1;
	}

	/** Motif key for a raised wall visual of a region, or null for a plain wall. */
	public static String motifFor(int region, int visual) {
		if (visual < DungeonTileSheet.RAISED_WALL || visual >= DungeonTileSheet.RAISED_WALL + 32) return null;
		int end = (visual - DungeonTileSheet.RAISED_WALL) % 4; //+1 open right, +2 open left, +3 pillar
		int group = visual - end;
		switch (region) {
			case HINTERHOF:
				if (group == DungeonTileSheet.RAISED_WALL) return end == 1 ? "shisha" : end == 2 ? "konditorei" : end == 3 ? "barbershop" : null;
				if (group == DungeonTileSheet.RAISED_WALL_DECO) return "barbershop";
				if (group == DungeonTileSheet.RAISED_WALL_DECO_ALT) return "fallrohr";
				if (group == DungeonTileSheet.RAISED_WALL_ALT) return end == 1 ? "maerz_1" : end == 2 ? "graffiti_miete" : end == 3 ? "flyer_baerg" : null;
				if (group == DungeonTileSheet.RAISED_WALL_NOTICE) return "gesuch_1";
				return null;
			case AMT:
				if (group == DungeonTileSheet.RAISED_WALL_DECO) return "amtslampe";
				if (group == DungeonTileSheet.RAISED_WALL_DECO_ALT) return "graffiti_herz";
				if (group == DungeonTileSheet.RAISED_WALL_ALT) return end == 1 ? "feuerloescher" : end == 2 ? "maerz_2" : end == 3 ? "notausgang" : null;
				if (group == DungeonTileSheet.RAISED_WALL_NOTICE) return "gesuch_2";
				return null;
			case BAUSTELLE:
				//WALL_DECO (copper cable) keeps levels.caveslevel.wall_deco_desc
				if (group == DungeonTileSheet.RAISED_WALL_ALT) return end == 0 ? "plakat_baerg" : end == 2 ? "graffiti_kran" : null;
				if (group == DungeonTileSheet.RAISED_WALL_NOTICE) return "gesuch_3";
				return null;
			case RENDITE:
				if (group == DungeonTileSheet.RAISED_WALL_DECO || group == DungeonTileSheet.RAISED_WALL_DECO_ALT) return "lueftung";
				if (group == DungeonTileSheet.RAISED_WALL_ALT) return end == 1 ? "kamera" : end == 2 ? "messingschild" : end == 3 ? "graffiti_vermieten" : null;
				if (group == DungeonTileSheet.RAISED_WALL_NOTICE) return "graffiti_kiez";
				return null;
			case RATHAUS:
				if (group == DungeonTileSheet.RAISED_WALL_DECO || group == DungeonTileSheet.RAISED_WALL_DECO_ALT) return "paternoster";
				if (group == DungeonTileSheet.RAISED_WALL_ALT) return end == 3 ? "graffiti_wegda" : null;
				if (group == DungeonTileSheet.RAISED_WALL_NOTICE) return "graffiti_taube";
				return null;
			default:
				return null;
		}
	}

	/** Raised wall visual drawn at a cell (as DungeonTerrainTilemap does), or -1. */
	public static int visual(Level level, int cell) {
		byte[] variance = DungeonTileSheet.tileVariance;
		if (variance == null || variance.length != level.length() || cell < 0 || cell >= level.length()) return -1;
		int tile = level.map[cell];
		if (tile != Terrain.WALL && tile != Terrain.WALL_DECO && tile != Terrain.SECRET_DOOR) return -1;
		int w = level.width();
		return DungeonTileSheet.getRaisedWallTile(
				tile,
				cell,
				(cell + 1) % w != 0 ? level.map[cell + 1] : -1,
				cell + w < level.length() ? level.map[cell + w] : -1,
				cell % w != 0 ? level.map[cell - 1] : -1);
	}

	/** Motif key shown at a cell of the current level, or null. */
	public static String motif(Level level, int cell) {
		if (!enabled(level)) return null;
		int visual = visual(level, cell);
		return visual < 0 ? null : motifFor(region(level.tilesTex()), visual);
	}

	public static String name(Level level, int cell) {
		String key = motif(level, cell);
		return key == null ? null : Messages.get(WallDeco.class, key + "_name");
	}

	public static String desc(Level level, int cell) {
		String key = motif(level, cell);
		return key == null ? null : Messages.get(WallDeco.class, key);
	}
}
