/*
 * Pixel Dungeon
 * Copyright (C) 2012-2015 Oleg Dolya
 *
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 */

package com.shatteredpixel.shatteredpixeldungeon.actors.mobs;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.Actor;
import com.shatteredpixel.shatteredpixeldungeon.items.trinkets.RatSkull;
import com.watabou.utils.Random;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;

public class MobSpawner extends Actor {
	{
		actPriority = BUFF_PRIO; //as if it were a buff.
	}

	@Override
	protected boolean act() {

		if (Dungeon.level.mobCount() < Dungeon.level.mobLimit()) {

			if (Dungeon.level.spawnMob(12)){
				spend(Dungeon.level.respawnCooldown());
			} else {
				//try again in 1 turn
				spend(TICK);
			}

		} else {
			spend(Dungeon.level.respawnCooldown());
		}

		return true;
	}

	public void resetCooldown(){
		spend(-cooldown());
		spend(Dungeon.level.respawnCooldown());
	}

	public static ArrayList<Class<? extends Mob>> getMobRotation(int depth ){
		ArrayList<Class<? extends Mob>> mobs = standardMobRotation( depth );
		addRareMobs(depth, mobs);
		swapMobAlts(mobs);
		Random.shuffle(mobs);
		return mobs;
	}

	//returns a rotation of standard mobs, unshuffled.
	private static ArrayList<Class<? extends Mob>> standardMobRotation( int depth ){
		switch(depth){

			// Sewers
			case 1: default:
				//3x rat, 1x snake
				return new ArrayList<>(Arrays.asList(
						Rat.class, Rat.class, Rat.class,
						Snake.class));
			case 2:
				//2x rat, 1x snake, 1x gnoll, 1x gas alchemist, 1x e-scooter
				return new ArrayList<>(Arrays.asList(Rat.class, Rat.class,
						Snake.class,
						Gnoll.class, GasAlchemist.class,
						EScooter.class));
			case 3:
				//1x rat, 1x snake, 1x gnoll, 1x gas alchemist, 1x e-scooter, 1x swarm, 1x crab, 1x deposit golem
				return new ArrayList<>(Arrays.asList(Rat.class,
						Snake.class,
						Gnoll.class, GasAlchemist.class,
						EScooter.class,
						Swarm.class,
						Crab.class,
						Pfandgolem.class));
			case 4: case 5:
				//1x gas alchemist, 1x e-scooter, 1x swarm, 1x crab, 1x deposit golem, 2x slime
				return new ArrayList<>(Arrays.asList(GasAlchemist.class,
						EScooter.class,
						Swarm.class,
						Crab.class,
						Pfandgolem.class,
						Slime.class, Slime.class));

			// Prison
			case 6:
				//3x skeleton, 1x thief, 1x appointment reseller, 1x swarm
				return new ArrayList<>(Arrays.asList(Skeleton.class, Skeleton.class, Skeleton.class,
						Thief.class, Terminhaendler.class,
						Swarm.class));
			case 7:
				//2x skeleton, 1x thief, 1x appointment reseller, 1x DM-100, 1x guard
				return new ArrayList<>(Arrays.asList(Skeleton.class, Skeleton.class,
						Thief.class, Terminhaendler.class,
						DM100.class,
						Guard.class));
			case 8:
				//2x skeleton, 1x thief, 1x appointment reseller, 2x DM-100, 2x guard, 1x necromancer
				return new ArrayList<>(Arrays.asList(Skeleton.class, Skeleton.class,
						Thief.class, Terminhaendler.class,
						DM100.class, DM100.class,
						Guard.class, Guard.class,
						Necromancer.class));
			case 9: case 10:
				//1x skeleton, 1x thief, 1x appointment reseller, 2x DM-100, 2x guard, 2x necromancer
				return new ArrayList<>(Arrays.asList(Skeleton.class,
						Thief.class, Terminhaendler.class,
						DM100.class, DM100.class,
						Guard.class, Guard.class,
						Necromancer.class, Necromancer.class));

			// Caves
			case 11:
				//1x bat, 1x afterhour raver, 1x brute, 1x jackhammer worker, 1x shaman
				return new ArrayList<>(Arrays.asList(
						Bat.class, Technojuenger.class,
						Brute.class, Presslufter.class,
						Shaman.random()));
			case 12:
				//1x bat, 1x afterhour raver, 1x brute, 1x jackhammer worker, 1x shaman, 1x spinner
				return new ArrayList<>(Arrays.asList(
						Bat.class, Technojuenger.class,
						Brute.class, Presslufter.class,
						Shaman.random(),
						Spinner.class));
			case 13:
				//1x bat, 1x afterhour raver, 1x brute, 1x jackhammer worker, 2x shaman, 2x spinner, 1x DM-200
				return new ArrayList<>(Arrays.asList(
						Bat.class, Technojuenger.class,
						Brute.class, Presslufter.class,
						Shaman.random(), Shaman.random(),
						Spinner.class, Spinner.class,
						DM200.class));
			case 14: case 15:
				//1x afterhour raver, 1x brute, 1x jackhammer worker, 2x shaman, 2x spinner, 2x DM-200
				return new ArrayList<>(Arrays.asList(
						Technojuenger.class,
						Brute.class, Presslufter.class,
						Shaman.random(), Shaman.random(),
						Spinner.class, Spinner.class,
						DM200.class, DM200.class));

			// City
			case 16:
				//2x ghoul, 1x luxury developer, 1x elemental, 1x warlock
				return new ArrayList<>(Arrays.asList(
						Ghoul.class, Ghoul.class, Luxussanierer.class,
						Elemental.random(),
						Warlock.class));
			case 17:
				//1x ghoul, 1x luxury developer, 2x elemental, 1x warlock, 1x monk
				return new ArrayList<>(Arrays.asList(
						Ghoul.class, Luxussanierer.class,
						Elemental.random(), Elemental.random(),
						Warlock.class,
						Monk.class));
			case 18:
				//1x ghoul, 1x luxury developer, 1x elemental, 2x warlock, 2x monk, 1x golem
				return new ArrayList<>(Arrays.asList(
						Ghoul.class, Luxussanierer.class,
						Elemental.random(),
						Warlock.class, Warlock.class,
						Monk.class, Monk.class,
						Golem.class));
			case 19: case 20:
				//1x luxury developer, 1x elemental, 2x warlock, 2x monk, 3x golem
				return new ArrayList<>(Arrays.asList(
						Luxussanierer.class,
						Elemental.random(),
						Warlock.class, Warlock.class,
						Monk.class, Monk.class,
						Golem.class, Golem.class, Golem.class));

			// Halls
			case 21:
				//1x succubus, 1x house rules hydra, 1x evil eye
				return new ArrayList<>(Arrays.asList(
						Succubus.class, HausordnungsHydra.class,
						Eye.class));
			case 22:
				//1x succubus, 1x house rules hydra, 1x evil eye
				return new ArrayList<>(Arrays.asList(
						Succubus.class, HausordnungsHydra.class,
						Eye.class));
			case 23:
				//1x succubus, 1x house rules hydra, 2x evil eye, 1x scorpio
				return new ArrayList<>(Arrays.asList(
						Succubus.class, HausordnungsHydra.class,
						Eye.class, Eye.class,
						Scorpio.class));
			case 24: case 25: case 26:
				//1x succubus, 1x house rules hydra, 2x evil eye, 2x scorpio
				return new ArrayList<>(Arrays.asList(
						Succubus.class, HausordnungsHydra.class,
						Eye.class, Eye.class,
						Scorpio.class, Scorpio.class));
		}

	}

	//has a chance to add a rarely spawned mobs to the rotation
	public static void addRareMobs( int depth, ArrayList<Class<?extends Mob>> rotation ){

		switch (depth){

			// Sewers
			default:
				return;
			case 4:
				if (Random.Float() < 0.025f) rotation.add(Thief.class);
				return;

			// Prison
			case 9:
				if (Random.Float() < 0.025f) rotation.add(Bat.class);
				return;

			// Caves
			case 14:
				if (Random.Float() < 0.025f) rotation.add(Ghoul.class);
				return;

			// City
			case 19:
				if (Random.Float() < 0.025f) rotation.add(Succubus.class);
				return;
		}
	}

	//switches out regular mobs for their alt versions when appropriate
	private static void swapMobAlts(ArrayList<Class<?extends Mob>> rotation) {
		float altChance = 1 / 50f * RatSkull.exoticChanceMultiplier();
		for (int i = 0; i < rotation.size(); i++) {
			if (Random.Float() < altChance) {
				Class<? extends Mob> cl = rotation.get(i);
				Class<? extends Mob> alt = RARE_ALTS.get(cl);
				if (alt != null) {
					rotation.set(i, alt);
				}
			}
		}
	}

	public static final HashMap<Class<?extends Mob>, Class<?extends Mob>> RARE_ALTS = new HashMap<>();
	static {
		RARE_ALTS.put(Rat.class,            Albino.class);
		RARE_ALTS.put(Gnoll.class,          GnollExile.class);
		RARE_ALTS.put(Crab.class,           HermitCrab.class);
		RARE_ALTS.put(Slime.class,          CausticSlime.class);

		RARE_ALTS.put(Thief.class,          Bandit.class);
		RARE_ALTS.put(Necromancer.class,    SpectralNecromancer.class);

		RARE_ALTS.put(Brute.class,          ArmoredBrute.class);
		RARE_ALTS.put(DM200.class,          DM201.class);

		RARE_ALTS.put(Monk.class,           Senior.class);
		//swapping to chaos elemental actually happens in Elemental.random
		RARE_ALTS.put(Elemental.class,      Elemental.ChaosElemental.class);

		RARE_ALTS.put(Scorpio.class,        Acidic.class);
	}
}
