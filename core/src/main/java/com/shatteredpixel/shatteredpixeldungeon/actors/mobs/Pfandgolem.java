/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Char;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Blob;
import com.shatteredpixel.shatteredpixeldungeon.actors.blobs.Scherben;
import com.shatteredpixel.shatteredpixeldungeon.items.Gold;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene;
import com.shatteredpixel.shatteredpixeldungeon.sprites.PfandgolemSprite;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;
import com.watabou.utils.PathFinder;
import com.watabou.utils.Random;

/**
 * A slow, sturdy heap of deposit bottles. When it breaks, it leaves a ring of
 * glass shards that hurt anyone walking through them for a while.
 */
public class Pfandgolem extends Mob {

	{
		spriteClass = PfandgolemSprite.class;

		HP = HT = 18;
		defenseSkill = 2;
		baseSpeed = 0.5f;

		EXP = 4;
		maxLvl = 9;

		loot = Gold.class;
		lootChance = 1f;

		properties.add(Property.INORGANIC);
	}

	@Override
	public int damageRoll() {
		return Random.NormalIntRange( 2, 5 );
	}

	@Override
	public int attackSkill( Char target ) {
		return 10;
	}

	@Override
	public int drRoll() {
		return super.drRoll() + Random.NormalIntRange(0, 3);
	}

	/** Cells that receive shards: its own cell plus every walkable neighbour. */
	public static void shatter( int cell ) {
		for (int offset : PathFinder.NEIGHBOURS9) {
			int c = cell + offset;
			if (Dungeon.level.insideMap(c) && Dungeon.level.passable[c]) {
				GameScene.add(Blob.seed(c, Scherben.DURATION, Scherben.class));
			}
		}
	}

	@Override
	public void die( Object cause ) {
		shatter(pos);
		if (Dungeon.level.heroFOV[pos]) GLog.w(Messages.get(this, "shatter"));
		super.die(cause);
	}
}
