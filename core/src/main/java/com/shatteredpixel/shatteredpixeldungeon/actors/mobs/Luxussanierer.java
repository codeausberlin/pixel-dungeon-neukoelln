/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Bauzaun;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Blob;
import com.shatteredpixel.shatteredpixeldungeon.levels.Level;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.shatteredpixel.shatteredpixeldungeon.sprites.LuxussaniererSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.Bundle;
import com.watabou.utils.PathFinder;
import com.watabou.utils.Random;

import java.util.ArrayList;
import java.util.List;

/**
 * Marks the tiles behind its target one turn in advance, then fences them off
 * with temporary, flammable barricades so the target cannot simply back away.
 */
public class Luxussanierer extends Mob {

	public static final int MIN_RANGE = 2;
	public static final int MAX_RANGE = 6;
	public static final int COOLDOWN = 7;

	private int[] planned = new int[0];
	private int cooldown = 2;

	{
		spriteClass = LuxussaniererSprite.class;

		HP = HT = 60;
		defenseSkill = 20;

		EXP = 12;
		maxLvl = 23;

		HUNTING = new Hunting();
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 10, 20 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 28;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 8);
	}

	@Override
	protected boolean act() {
		if (cooldown > 0 && paralysed == 0) cooldown--;
		if (paralysed > 0) planned = new int[0];
		return super.act();
	}

	/** Buildable tiles next to the target that lie farther from the builder: its escape routes. */
	public static List<Integer> fenceCells( Level level, int builder, int target ) {
		List<Integer> cells = new ArrayList<>();
		int dist = level.distance(builder, target);
		for (int offset : PathFinder.NEIGHBOURS8) {
			int cell = target + offset;
			if (Bauzaun.buildable(level, cell) && level.distance(builder, cell) > dist) {
				cells.add(cell);
			}
		}
		return cells;
	}

	private class Hunting extends Mob.Hunting {
		@Override
		public boolean act( boolean enemyInFOV, boolean justAlerted ) {
			if (planned.length > 0) {
				build();
				return true;
			}
			if (cooldown == 0 && enemyInFOV && enemy != null && enemy.isAlive()
					&& Dungeon.level.heroFOV[pos]) {
				int dist = Dungeon.level.distance(pos, enemy.pos);
				List<Integer> cells = dist >= MIN_RANGE && dist <= MAX_RANGE
						? fenceCells(Dungeon.level, pos, enemy.pos) : new ArrayList<>();
				if (!cells.isEmpty()) {
					planned = new int[cells.size()];
					for (int i = 0; i < planned.length; i++) {
						planned[i] = cells.get(i);
						GameScene.targetedCell(planned[i], 1f);
					}
					cooldown = COOLDOWN;
					if (sprite != null) sprite.showStatus(CharSprite.WARNING, Messages.get(Luxussanierer.this, "plan"));
					GLog.w(Messages.get(Luxussanierer.this, "warning"));
					spend(TICK);
					return true;
				}
			}
			return super.act(enemyInFOV, justAlerted);
		}
	}

	private void build() {
		for (int cell : planned) {
			//anything that moved onto a marked tile in the meantime keeps it free
			GameScene.add(Blob.seed(cell, Bauzaun.DURATION, Bauzaun.class));
		}
		planned = new int[0];
		if (Dungeon.hero != null) Dungeon.observe();
		spend(TICK);
	}

	private static final String PLANNED = "planned";
	private static final String FENCE_COOLDOWN = "fence_cooldown";

	@Override
	public void storeInBundle( Bundle bundle ) {
		super.storeInBundle(bundle);
		bundle.put(PLANNED, planned);
		bundle.put(FENCE_COOLDOWN, cooldown);
	}

	@Override
	public void restoreFromBundle( Bundle bundle ) {
		super.restoreFromBundle(bundle);
		planned = bundle.contains(PLANNED) ? bundle.getIntArray(PLANNED) : new int[0];
		cooldown = bundle.getInt(FENCE_COOLDOWN);
	}
}
