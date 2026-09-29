/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.buffs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.mobs.HausordnungsHydra;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.ui.BuffIndicator;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.noosa.Image;
import com.watabou.utils.Bundle;
import com.watabou.utils.Random;

/**
 * A house rule announced by the Hausordnungs-Hydra.
 * QUIET: moving is a violation. SWEEP: staying on the same tile is a violation.
 * The first action after the announcement is always free, so the player can react.
 */
public class Hausregel extends Buff {

	public static final int QUIET = 0;
	public static final int SWEEP = 1;

	public static final int DURATION = 3;
	public static final int MIN_FINE = 8;
	public static final int MAX_FINE = 14;

	{
		type = buffType.NEGATIVE;
		announced = true;
	}

	private int rule = QUIET;
	private int left = DURATION;
	private int grace = 2;
	private int lastPos = -1;

	public void set( int rule ) {
		this.rule = rule;
		left = DURATION;
		grace = 2;
		lastPos = -1;
	}

	public int rule() {
		return rule;
	}

	/** Pure rule check so it can be tested without a running scene. */
	public static boolean violates( int rule, int before, int after ) {
		return rule == QUIET ? before != after : before == after;
	}

	@Override
	public boolean act() {
		boolean stuck = target.paralysed > 0 || target.buff(Roots.class) != null
				|| target.buff(Frost.class) != null;
		if (grace > 0 || lastPos == -1) {
			grace = Math.max(0, grace - 1);
		} else {
			//nobody gets fined for not sweeping while they are unable to move
			if (violates(rule, lastPos, target.pos) && !(rule == SWEEP && stuck)) {
				int fine = Random.NormalIntRange(MIN_FINE, MAX_FINE);
				target.damage(fine, this);
				if (target == Dungeon.hero) {
					GLog.w(Messages.get(this, rule == QUIET ? "fine_quiet" : "fine_sweep", fine));
					if (!target.isAlive()) {
						Dungeon.fail(HausordnungsHydra.class);
						GLog.n(Messages.get(this, "ondeath"));
					}
				}
			}
			left--;
		}
		lastPos = target.pos;
		if (left <= 0 || !target.isAlive()) {
			detach();
		}
		spend(TICK);
		return true;
	}

	@Override
	public int icon() {
		return BuffIndicator.MARK;
	}

	@Override
	public void tintIcon( Image icon ) {
		if (rule == QUIET) icon.hardlight(0.4f, 0.6f, 1f);
		else icon.hardlight(1f, 0.6f, 0.2f);
	}

	@Override
	public String iconTextDisplay() {
		return Integer.toString(left);
	}

	@Override
	public String name() {
		return Messages.get(this, rule == QUIET ? "name_quiet" : "name_sweep");
	}

	@Override
	public String desc() {
		return Messages.get(this, rule == QUIET ? "desc_quiet" : "desc_sweep", left);
	}

	private static final String RULE = "rule";
	private static final String LEFT = "left";
	private static final String GRACE = "grace";
	private static final String LAST_POS = "last_pos";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(RULE, rule);
		bundle.put(LEFT, left);
		bundle.put(GRACE, grace);
		bundle.put(LAST_POS, lastPos);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		rule = bundle.getInt(RULE);
		left = bundle.getInt(LEFT);
		grace = bundle.getInt(GRACE);
		lastPos = bundle.getInt(LAST_POS);
	}
}
