/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Blob;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.ToxicGas;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.GasAlchemistSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;

/** A leaking alchemy rig: a full warning turn lets the player retreat. */
public class GasAlchemist extends Gnoll {

	private boolean venting;
	private int cooldown = 3;

	{
		spriteClass = GasAlchemistSprite.class;
		HUNTING = new Hunting();
		immunities.add(ToxicGas.class);
	}

	@Override
	protected boolean act() {
		if (cooldown > 0 && paralysed == 0) cooldown--;
		return super.act();
	}

	private class Hunting extends Mob.Hunting {
		@Override
		public boolean act(boolean enemyInFOV, boolean justAlerted) {
			if (venting) {
				GameScene.add(Blob.seed(pos, 24, ToxicGas.class));
				venting = false;
				cooldown = 6;
				spend(TICK);
				return true;
			}
			if (cooldown == 0 && enemyInFOV && enemy != null
					&& enemy.isAlive() && Dungeon.level.distance(pos, enemy.pos) <= 2
					&& Dungeon.level.heroFOV[pos]) {
				venting = true;
				sprite.showStatus(CharSprite.WARNING, "!!!");
				GLog.w(Messages.get(GasAlchemist.this, "warning"));
				spend(TICK);
				return true;
			}
			return super.act(enemyInFOV, justAlerted);
		}
	}

	@Override
	public void storeInBundle(Bundle bundle) {
		super.storeInBundle(bundle);
		bundle.put("venting", venting);
		bundle.put("vent_cooldown", cooldown);
	}

	@Override
	public void restoreFromBundle(Bundle bundle) {
		super.restoreFromBundle(bundle);
		venting = bundle.getBoolean("venting");
		cooldown = bundle.getInt("vent_cooldown");
	}
}
