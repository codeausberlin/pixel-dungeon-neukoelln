/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Actor;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.effects.CellEmitter;
import com.shatteredpixel.shatteredpixeldungeon.effects.Speck;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;
import com.shatteredpixel.shatteredpixeldungeon.scenes.PixelScene;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.PresslufterSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;
import com.watabou.utils.PathFinder;
import com.watabou.utils.Random;

import java.util.ArrayList;
import java.util.List;

/**
 * A construction worker with a jackhammer. Next to its target it spends one turn
 * revving up and marking every surrounding tile, then pounds all of them at once.
 */
public class Presslufter extends Mob {

	public static final int COOLDOWN = 5;

	private boolean revving = false;
	private int cooldown = 1;

	{
		spriteClass = PresslufterSprite.class;

		HP = HT = 35;
		defenseSkill = 12;

		EXP = 8;
		maxLvl = 17;

		HUNTING = new Hunting();
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 6, 18 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 20;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 6);
	}

	@Override
	protected boolean act() {
		if (cooldown > 0 && paralysed == 0) cooldown--;
		//a stunned worker loses the run-up
		if (paralysed > 0) revving = false;
		return super.act();
	}

	/** Every walkable tile around the worker; these are marked and then hit. */
	public static List<Integer> poundCells( int pos ) {
		List<Integer> cells = new ArrayList<>();
		for (int offset : PathFinder.NEIGHBOURS8) {
			int cell = pos + offset;
			if (Dungeon.level.insideMap(cell) && !Dungeon.level.solid[cell]) {
				cells.add(cell);
			}
		}
		return cells;
	}

	private class Hunting extends Mob.Hunting {
		@Override
		public boolean act( boolean enemyInFOV, boolean justAlerted ) {
			if (revving) {
				pound();
				return true;
			}
			if (cooldown == 0 && enemyInFOV && enemy != null && enemy.isAlive()
					&& Dungeon.level.adjacent(pos, enemy.pos) && Dungeon.level.heroFOV[pos]) {
				revving = true;
				cooldown = COOLDOWN;
				for (int cell : poundCells(pos)) {
					GameScene.targetedCell(cell, 1f);
				}
				if (sprite != null) sprite.showStatus(CharSprite.WARNING, Messages.get(Presslufter.this, "rev"));
				GLog.w(Messages.get(Presslufter.this, "warning"));
				spend(TICK);
				return true;
			}
			return super.act(enemyInFOV, justAlerted);
		}
	}

	private void pound() {
		revving = false;
		for (int cell : poundCells(pos)) {
			if (Dungeon.level.heroFOV[cell]) CellEmitter.get(cell).burst(Speck.factory(Speck.ROCK), 3);
			Char ch = Actor.findChar(cell);
			if (ch == null || ch == this) continue;
			int dmg = Math.max(1, Random.NormalIntRange(10, 24) - ch.drRoll());
			ch.damage(dmg, this);
			if (ch == Dungeon.hero && !ch.isAlive()) {
				Dungeon.fail(this);
				GLog.n(Messages.get(this, "ondeath"));
			}
		}
		//no sprite.attack() here: its completion callback would trigger a regular melee hit as well
		if (Dungeon.level.heroFOV[pos]) PixelScene.shake(2, 0.3f);
		spend(TICK);
	}

	private static final String REVVING = "revving";
	private static final String POUND_COOLDOWN = "pound_cooldown";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(REVVING, revving);
		bundle.put(POUND_COOLDOWN, cooldown);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		revving = bundle.getBoolean(REVVING);
		cooldown = bundle.getInt(POUND_COOLDOWN);
	}
}
