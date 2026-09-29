/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Actor;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Buff;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Paralysis;
import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.mechanics.Ballistica;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.EScooterSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;
import com.watabou.utils.Random;

import java.util.ArrayList;
import java.util.List;

/**
 * A rental scooter that rings its bell one turn before charging along a straight lane.
 * Whoever still stands in the lane gets hit; if the lane is empty it crashes into the wall.
 */
public class EScooter extends Mob {

	public static final int MIN_RANGE = 2;
	public static final int MAX_RANGE = 5;
	public static final int CHARGE_LENGTH = 6;
	public static final int COOLDOWN = 4;

	private int chargeTarget = -1;
	private int cooldown = 2;

	{
		spriteClass = EScooterSprite.class;

		HP = HT = 10;
		defenseSkill = 5;

		EXP = 2;
		maxLvl = 7;

		HUNTING = new Hunting();

		properties.add(Property.INORGANIC);
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 1, 4 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 10;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 1);
	}

	@Override
	protected boolean act() {
		if (cooldown > 0 && paralysed == 0) cooldown--;
		//a stunned scooter forgets its run-up
		if (paralysed > 0) chargeTarget = -1;
		return super.act();
	}

	/** Straight lanes only (row, column or exact diagonal), so the danger zone is easy to read. */
	public static boolean inLane( Level level, int from, int to ) {
		int dx = level.cellToPoint(to).x - level.cellToPoint(from).x;
		int dy = level.cellToPoint(to).y - level.cellToPoint(from).y;
		if (dx == 0 && dy == 0) return false;
		if (dx != 0 && dy != 0 && Math.abs(dx) != Math.abs(dy)) return false;
		int dist = level.distance(from, to);
		if (dist < MIN_RANGE || dist > MAX_RANGE) return false;
		Ballistica line = new Ballistica(from, to, Ballistica.PROJECTILE);
		return line.collisionPos == to;
	}

	/** The cells the scooter will roll over, starting next to it and stopping before walls. */
	public static List<Integer> lane( int from, int target ) {
		Ballistica line = new Ballistica(from, target, Ballistica.STOP_SOLID);
		int end = Math.min(line.dist, CHARGE_LENGTH);
		List<Integer> cells = new ArrayList<>();
		for (int i = 1; i <= end; i++) {
			int cell = line.path.get(i);
			if (!Dungeon.level.passable[cell] && !Dungeon.level.avoid[cell]) break;
			cells.add(cell);
		}
		return cells;
	}

	private class Hunting extends Mob.Hunting {
		@Override
		public boolean act( boolean enemyInFOV, boolean justAlerted ) {
			if (chargeTarget != -1) {
				charge();
				return true;
			}
			if (cooldown == 0 && enemyInFOV && enemy != null && enemy.isAlive()
					&& Dungeon.level.heroFOV[pos] && inLane(Dungeon.level, pos, enemy.pos)) {
				chargeTarget = enemy.pos;
				cooldown = COOLDOWN;
				if (sprite != null) {
					sprite.turnTo(pos, chargeTarget);
					sprite.showStatus(CharSprite.WARNING, Messages.get(EScooter.this, "bell"));
				}
				for (int cell : lane(pos, chargeTarget)) {
					GameScene.targetedCell(cell, 1f);
				}
				GLog.w(Messages.get(EScooter.this, "warning"));
				spend(TICK);
				return true;
			}
			return super.act(enemyInFOV, justAlerted);
		}
	}

	private void charge() {
		List<Integer> cells = lane(pos, chargeTarget);
		chargeTarget = -1;

		int landing = pos;
		Char victim = null;
		for (int cell : cells) {
			Char ch = Actor.findChar(cell);
			if (ch != null) {
				victim = ch;
				break;
			}
			landing = cell;
		}

		if (landing != pos) {
			int from = pos;
			move(landing, false);
			if (sprite != null) sprite.move(from, landing);
		}

		if (victim != null) {
			int dmg = Math.max(1, Random.NormalIntRange(3, 7) - victim.drRoll());
			victim.damage(dmg, this);
			if (victim == Dungeon.hero && !victim.isAlive()) {
				Dungeon.fail(this);
				GLog.n(Messages.get(this, "ondeath"));
			} else if (victim == Dungeon.hero) {
				GLog.w(Messages.get(this, "hit_hero"));
			} else if (Dungeon.level.heroFOV[victim.pos]) {
				GLog.i(Messages.get(this, "hit", victim.name()));
			}
		} else {
			//nobody in the lane: the scooter ends up on its side
			damage(Random.NormalIntRange(1, 3), this);
			if (isAlive()) {
				Buff.affect(this, Paralysis.class, 2f);
				if (Dungeon.level.heroFOV[pos]) GLog.p(Messages.get(this, "crash"));
			}
		}
		spend(TICK);
	}

	private static final String CHARGE_TARGET = "charge_target";
	private static final String CHARGE_COOLDOWN = "charge_cooldown";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(CHARGE_TARGET, chargeTarget);
		bundle.put(CHARGE_COOLDOWN, cooldown);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		chargeTarget = bundle.contains(CHARGE_TARGET) ? bundle.getInt(CHARGE_TARGET) : -1;
		cooldown = bundle.getInt(CHARGE_COOLDOWN);
	}
}
