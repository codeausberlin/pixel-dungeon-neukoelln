/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.blobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Actor;
import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.levels.Terrain;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;

/**
 * Temporary construction fences. Each fenced cell becomes a barricade (solid,
 * blocks sight, flammable) and turns back into plain floor when its timer runs out.
 * Burning a fence early works like burning any barricade.
 */
public class Bauzaun extends Blob {

	public static final int DURATION = 8;

	/** Only plain, empty floor without characters or items gets fenced. */
	public static boolean buildable( Level level, int cell ) {
		if (!level.insideMap(cell)) return false;
		int t = level.map[cell];
		if (t != Terrain.EMPTY && t != Terrain.EMPTY_SP && t != Terrain.EMPTY_DECO
				&& t != Terrain.GRASS && t != Terrain.EMBERS) return false;
		if (Actor.findChar(cell) != null) return false;
		return level.heaps == null || level.heaps.get(cell) == null;
	}

	@Override
	public void seed( Level level, int cell, int amount ) {
		if (!buildable(level, cell)) return;
		super.seed(level, cell, amount);
		Level.set(cell, Terrain.BARRICADE, level);
		GameScene.updateMap(cell);
	}

	@Override
	protected void evolve() {
		int cell;
		boolean observe = false;
		Level l = Dungeon.level;
		for (int i = area.left; i < area.right; i++){
			for (int j = area.top; j < area.bottom; j++){
				cell = i + j*l.width();
				off[cell] = cur[cell] > 0 ? cur[cell] - 1 : 0;
				volume += off[cell];
				if (off[cell] == 0 && cur[cell] > 0 && l.map[cell] == Terrain.BARRICADE){
					Level.set(cell, Terrain.EMPTY, l);
					GameScene.updateMap(cell);
					observe = true;
				}
			}
		}
		if (observe && Dungeon.hero != null) Dungeon.observe();
	}

	@Override
	public String tileDesc() {
		return Messages.get(this, "desc");
	}
}
