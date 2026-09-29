/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Actor;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Buff;
import com.shatteredpixel.shatteredpixeldungeon.actors.buffs.Vertigo;
import com.shatteredpixel.shatteredpixeldungeon.items.wands.WandOfBlastWave;
import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.mechanics.Ballistica;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;
import com.shatteredpixel.shatteredpixeldungeon.scenes.PixelScene;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.TechnojuengerSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;
import com.watabou.utils.Random;

import java.util.ArrayList;
import java.util.List;

/**
 * An afterhour raver that never sleeps. Announces a bass drop one turn ahead,
 * then blasts everyone within 2 tiles away and leaves them dizzy.
 */
public class Technojuenger extends Mob {

	public static final int RADIUS = 2;
	public static final int PUSH = 2;
	public static final float DIZZY = 3f;
	public static final int COOLDOWN = 6;

	private boolean dropping = false;
	private int cooldown = 1;

	{
		spriteClass = TechnojuengerSprite.class;

		HP = HT = 40;
		defenseSkill = 14;

		EXP = 9;
		maxLvl = 18;

		//afterhour: never found asleep
		state = WANDERING;

		HUNTING = new Hunting();
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 6, 14 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 22;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 4);
	}

	@Override
	protected boolean act() {
		if (cooldown > 0 && paralysed == 0) cooldown--;
		if (paralysed > 0) dropping = false;
		//still no sleep, whatever happened
		if (state == SLEEPING) state = WANDERING;
		return super.act();
	}

	/** Walkable tiles within the drop radius; these are marked before the drop hits. */
	public static List<Integer> dropCells( Level level, int pos ) {
		List<Integer> cells = new ArrayList<>();
		for (int cell = 0; cell < level.length(); cell++) {
			if (cell != pos && !level.solid[cell] && level.distance(pos, cell) <= RADIUS) {
				cells.add(cell);
			}
		}
		return cells;
	}

	/** Neighbour offset pointing from the source towards the target, used as push direction. */
	public static int pushOffset( Level level, int from, int to ) {
		int dx = Integer.signum(level.cellToPoint(to).x - level.cellToPoint(from).x);
		int dy = Integer.signum(level.cellToPoint(to).y - level.cellToPoint(from).y);
		return dx + dy * level.width();
	}

	private class Hunting extends Mob.Hunting {
		@Override
		public boolean act( boolean enemyInFOV, boolean justAlerted ) {
			if (dropping) {
				drop();
				return true;
			}
			if (cooldown == 0 && enemyInFOV && enemy != null && enemy.isAlive()
					&& Dungeon.level.heroFOV[pos]
					&& Dungeon.level.distance(pos, enemy.pos) <= RADIUS) {
				dropping = true;
				cooldown = COOLDOWN;
				for (int cell : dropCells(Dungeon.level, pos)) {
					GameScene.targetedCell(cell, 1f);
				}
				if (sprite != null) sprite.showStatus(CharSprite.WARNING, Messages.get(Technojuenger.this, "drop_short"));
				GLog.w(Messages.get(Technojuenger.this, "warning"));
				spend(TICK);
				return true;
			}
			return super.act(enemyInFOV, justAlerted);
		}
	}

	private void drop() {
		dropping = false;
		for (int cell : dropCells(Dungeon.level, pos)) {
			Char ch = Actor.findChar(cell);
			if (ch == null || ch == this || !ch.isAlive()) continue;
			int offset = pushOffset(Dungeon.level, pos, ch.pos);
			if (offset != 0) {
				Ballistica trajectory = new Ballistica(ch.pos, ch.pos + offset, Ballistica.MAGIC_BOLT);
				WandOfBlastWave.throwChar(ch, trajectory, PUSH, false, true, this);
			}
			if (ch.isAlive()) Buff.affect(ch, Vertigo.class, DIZZY);
		}
		if (Dungeon.level.heroFOV[pos]) {
			PixelScene.shake(3, 0.4f);
			GLog.w(Messages.get(this, "drop"));
		}
		spend(TICK);
	}

	private static final String DROPPING = "dropping";
	private static final String DROP_COOLDOWN = "drop_cooldown";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(DROPPING, dropping);
		bundle.put(DROP_COOLDOWN, cooldown);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		dropping = bundle.getBoolean(DROPPING);
		cooldown = bundle.getInt(DROP_COOLDOWN);
	}
}
