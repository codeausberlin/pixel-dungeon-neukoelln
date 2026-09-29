/*
 * Neukolln Dungeon, based on Shattered Pixel Dungeon.
 * Licensed under the GNU General Public License, version 3 or later.
 */
package com.shatteredpixel.shatteredpixeldungeon.actors.hero;

import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.sprites.CharSprite;
import com.watabou.utils.Random;

/** Pure flavour: the Expat sometimes shouts startup jargon while zapping. No mechanical effect. */
public class ExpatIncantations {

	public static final int LINES = 12;
	public static final float CHANCE = 0.35f;

	public static String line( int i ) {
		return Messages.get(ExpatIncantations.class, "line_" + i);
	}

	public static void maybeShout( Hero hero ) {
		if (hero.heroClass != HeroClass.MAGE || hero.sprite == null) return;
		if (Random.Float() < CHANCE) {
			hero.sprite.showStatus(CharSprite.NEUTRAL, line(Random.Int(LINES)));
		}
	}
}
