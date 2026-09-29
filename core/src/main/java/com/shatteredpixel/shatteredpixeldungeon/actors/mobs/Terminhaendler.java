/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Buff;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Dread;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Slow;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Terror;
import com.shatteredpixel.shatteredpixeldungeon.items.Gold;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.TerminhaendlerSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;
import com.watabou.utils.Random;

/**
 * Hit and run: a successful hit puts the target into a short "waiting loop" (Slow),
 * then the reseller backs off for a few turns before coming back.
 */
public class Terminhaendler extends Mob {

	public static final float WAIT_LOOP = 3f;
	public static final int RETREAT_TURNS = 4;

	private int retreat = 0;

	{
		spriteClass = TerminhaendlerSprite.class;

		HP = HT = 18;
		defenseSkill = 10;

		EXP = 5;
		maxLvl = 12;

		loot = Gold.class;
		lootChance = 0.5f;

		FLEEING = new Fleeing();
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 2, 6 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 12;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 3);
	}

	@Override
	public int attackProc( Char enemy, int damage ) {
		damage = super.attackProc(enemy, damage);
		if (enemy.isAlive() && enemy.buff(Slow.class) == null) {
			Buff.affect(enemy, Slow.class, WAIT_LOOP);
			if (enemy == Dungeon.hero) GLog.w(Messages.get(this, "waitloop"));
		}
		if (isAlive() && state != FLEEING) {
			retreat = RETREAT_TURNS;
			state = FLEEING;
			if (sprite != null) sprite.showStatus(CharSprite.NEUTRAL, Messages.get(this, "sold"));
		}
		return damage;
	}

	/** Counts down while backing off, then returns to the hunt. */
	public boolean tickRetreat() {
		//only ends its own retreat, never fear effects like Terror
		if (retreat <= 0) return false;
		retreat--;
		if (retreat == 0 && state == FLEEING
				&& buff(Terror.class) == null && buff(Dread.class) == null) {
			state = HUNTING;
			return true;
		}
		return false;
	}

	private class Fleeing extends Mob.Fleeing {
		@Override
		public boolean act( boolean enemyInFOV, boolean justAlerted ) {
			if (tickRetreat()) {
				return state.act(enemyInFOV, justAlerted);
			}
			return super.act(enemyInFOV, justAlerted);
		}

		@Override
		protected void nowhereToRun() {
			retreat = 0;
			super.nowhereToRun();
		}
	}

	private static final String RETREAT = "retreat";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(RETREAT, retreat);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		retreat = bundle.getInt(RETREAT);
	}
}
