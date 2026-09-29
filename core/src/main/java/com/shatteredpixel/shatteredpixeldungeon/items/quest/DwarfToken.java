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

package com.shatteredpixel.shatteredpixeldungeon.items.quest;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.hero.Hero;
import com.shatteredpixel.shatteredpixeldungeon.actors.mobs.npcs.Imp;
import com.shatteredpixel.shatteredpixeldungeon.items.Item;
import com.shatteredpixel.shatteredpixeldungeon.levels.VaultLevel;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.sprites.ItemSpriteSheet;
import com.shatteredpixel.shatteredpixeldungeon.utils.GLog;

//Neukoelln: in the club labyrinth (VaultLevel) these are the "Garderobenmarken".
// Exactly VAULT_REQUIRED of them exist per club level, one per treasure room.
public class DwarfToken extends Item {

	public static final int VAULT_REQUIRED = 7;

	{
		//Neukoelln: wardrobe token icon (red tag with a white 7) drawn into the unused VIAL cell
		image = ItemSpriteSheet.VIAL;
		
		stackable = true;
		unique = true;
	}
	
	@Override
	public boolean isUpgradable() {
		return false;
	}
	
	@Override
	public boolean isIdentified() {
		return true;
	}

	@Override
	public boolean doPickUp(Hero hero, int pos) {
		if (Imp.Quest.mirrorUsed){
			GLog.i(Messages.get(this, "discard"));
			hero.next();
			return true;
		}
		if (!super.doPickUp(hero, pos)){
			return false;
		}
		if (Dungeon.level instanceof VaultLevel && !Imp.Quest.isOld()){
			int count = heldCount(hero);
			if (count >= VAULT_REQUIRED){
				GLog.p(Messages.get(DwarfToken.class, "complete", VAULT_REQUIRED));
			} else {
				GLog.i(Messages.get(DwarfToken.class, "progress", count, VAULT_REQUIRED));
			}
		}
		return true;
	}

	public static int heldCount(Hero hero){
		DwarfToken tokens = hero == null ? null : hero.belongings.getItem(DwarfToken.class);
		return tokens == null ? 0 : tokens.quantity();
	}

	@Override
	public String desc() {
		if (Imp.Quest.isOld()){
			return Messages.get(this, "desc_old");
		} else if (Dungeon.level instanceof VaultLevel && Dungeon.hero != null && !Imp.Quest.mirrorUsed){
			return super.desc() + "\n\n" + Messages.get(DwarfToken.class, "progress", heldCount(Dungeon.hero), VAULT_REQUIRED);
		} else {
			return super.desc();
		}

	}
}
