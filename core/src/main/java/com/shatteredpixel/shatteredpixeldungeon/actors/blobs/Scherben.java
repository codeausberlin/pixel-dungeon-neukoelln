/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.blobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.effects.BlobEmitter;
import com.shatteredpixel.shatteredpixeldungeon.effects.Speck;
import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Random;

/**
 * Broken deposit bottles. They do not spread, fade one step per turn and
 * hurt walking creatures that step into them. Marked as "avoid" like a visible trap.
 */
public class Scherben extends Blob {

	public static final int DURATION = 20;
	public static final int MIN_DAMAGE = 1;
	public static final int MAX_DAMAGE = 3;

	@Override
	protected void evolve() {
		int cell;
		Level l = Dungeon.level;
		for (int i = area.left; i < area.right; i++){
			for (int j = area.top; j < area.bottom; j++){
				cell = i + j*l.width();
				off[cell] = cur[cell] > 0 ? cur[cell] - 1 : 0;
				volume += off[cell];
				if (off[cell] == 0 && cur[cell] > 0){
					cellsToFlagUpdate.add(cell);
				}
			}
		}
	}

	@Override
	public void seed( Level level, int cell, int amount ) {
		super.seed(level, cell, amount);
		level.updateCellFlags(cell);
	}

	//called from Level.occupyCell when a non-flying character steps onto shards
	public static void affectChar( Char ch ){
		int dmg = Math.max(0, Random.NormalIntRange(MIN_DAMAGE, MAX_DAMAGE) - ch.drRoll()/2);
		if (dmg <= 0) return;
		ch.damage(dmg, Scherben.class);
		if (ch == Dungeon.hero) {
			GLog.w(Messages.get(Scherben.class, "step"));
			if (!ch.isAlive()) {
				Dungeon.fail(Scherben.class);
				GLog.n(Messages.get(Scherben.class, "ondeath"));
			}
		}
	}

	@Override
	public void onBuildFlagMaps( Level l ) {
		if (volume > 0){
			for (int i=0; i < l.length(); i++) {
				onUpdateCellFlags(l, i);
			}
		}
	}

	@Override
	public void onUpdateCellFlags( Level l, int cell ) {
		if (volume > 0 && cur[cell] > 0) {
			l.avoid[cell] = true;
		}
	}

	@Override
	public void use( BlobEmitter emitter ) {
		super.use( emitter );
		emitter.pour( Speck.factory( Speck.LIGHT ), 0.35f );
	}

	@Override
	public String tileDesc() {
		return Messages.get(this, "desc");
	}
}
