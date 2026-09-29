/* Licensed under the GNU General Public License, version 3 or later. */
package com.shatteredpixel.shatteredpixeldungeon.levels.rooms.standard;

import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.levels.Terrain;
import com.shatteredpixel.shatteredpixeldungeon.levels.painters.Painter;

/** Overgrown courtyard edges around an open, rain-soaked paved passage. */
public class HinterhofRoom extends EmptyRoom {

	@Override
	public void paint(Level level) {
		super.paint(level);
		for (int x = left + 2; x < right - 1; x++) {
			for (int y = top + 2; y < bottom - 1; y++) {
				boolean edge = x == left + 2 || x == right - 2
						|| y == top + 2 || y == bottom - 2;
				Painter.set(level, x, y, edge ? Terrain.GRASS : Terrain.EMPTY_SP);
			}
		}
		if (width() >= 7 && height() >= 7) {
			Painter.set(level, left + 2, top + 2, Terrain.WATER);
			Painter.set(level, right - 2, bottom - 2, Terrain.WATER);
		}
	}
}
