/* Licensed under the GNU General Public License, version 3 or later. */
package com.shatteredpixel.shatteredpixeldungeon.sprites;

import com.watabou.noosa.TextureFilm;

/** Frames come from tools/generate-technojuenger.cjs. */
public class TechnojuengerSprite extends MobSprite {

	public TechnojuengerSprite() {
		super();

		texture( "sprites/technojuenger.png" );

		TextureFilm frames = new TextureFilm( texture, 12, 15 );

		idle = new Animation( 4, true );
		idle.frames( frames, 0, 0, 0, 1 );

		run = new Animation( 15, true );
		run.frames( frames, 2, 3, 4, 5 );

		attack = new Animation( 15, false );
		attack.frames( frames, 6, 7, 8, 0 );

		die = new Animation( 10, false );
		die.frames( frames, 9, 10 );

		play( idle );
	}
}
