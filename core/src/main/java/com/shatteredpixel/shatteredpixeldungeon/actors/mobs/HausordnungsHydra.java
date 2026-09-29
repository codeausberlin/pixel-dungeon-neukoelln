/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Buff;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Hausregel;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.HausordnungsHydraSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;
import com.watabou.utils.Random;

/**
 * Announces alternating, contradictory house rules. While a rule is active,
 * breaking it costs health; the rules end when the hydra dies.
 */
public class HausordnungsHydra extends Mob {

	public static final int RANGE = 6;
	public static final int COOLDOWN = 7;

	private int nextRule = Hausregel.QUIET;
	private int cooldown = 2;

	{
		spriteClass = HausordnungsHydraSprite.class;

		HP = HT = 90;
		defenseSkill = 25;

		EXP = 16;
		maxLvl = 30;

		HUNTING = new Hunting();

		properties.add(Property.DEMONIC);
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 15, 25 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 35;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 10);
	}

	@Override
	protected boolean act() {
		if (cooldown > 0 && paralysed == 0) cooldown--;
		return super.act();
	}

	/** The rule the hydra announces next; it flips every time. */
	public int announce() {
		int rule = nextRule;
		nextRule = rule == Hausregel.QUIET ? Hausregel.SWEEP : Hausregel.QUIET;
		cooldown = COOLDOWN;
		return rule;
	}

	private class Hunting extends Mob.Hunting {
		@Override
		public boolean act( boolean enemyInFOV, boolean justAlerted ) {
			if (cooldown == 0 && enemyInFOV && enemy != null && enemy.isAlive()
					&& enemy.buff(Hausregel.class) == null
					&& Dungeon.level.heroFOV[pos]
					&& Dungeon.level.distance(pos, enemy.pos) <= RANGE) {
				int rule = announce();
				Buff.affect(enemy, Hausregel.class).set(rule);
				String key = rule == Hausregel.QUIET ? "quiet" : "sweep";
				if (sprite != null) sprite.showStatus(CharSprite.WARNING, Messages.get(HausordnungsHydra.this, key + "_short"));
				GLog.w(Messages.get(HausordnungsHydra.this, key));
				spend(TICK);
				return true;
			}
			return super.act(enemyInFOV, justAlerted);
		}
	}

	@Override
	public void die( Object cause ) {
		//no hydra, no house rules
		if (Dungeon.hero != null) Buff.detach(Dungeon.hero, Hausregel.class);
		super.die(cause);
	}

	private static final String NEXT_RULE = "next_rule";
	private static final String RULE_COOLDOWN = "rule_cooldown";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(NEXT_RULE, nextRule);
		bundle.put(RULE_COOLDOWN, cooldown);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		nextRule = bundle.getInt(NEXT_RULE);
		cooldown = bundle.getInt(RULE_COOLDOWN);
	}
}
