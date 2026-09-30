/*
 * Pixel Dungeon
 * Copyright (C) 2012-2015 Oleg Dolya
 *
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * Pixel Dungeon Neukoelln (fork of Shattered Pixel Dungeon)
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

package com.shatteredpixel.shatteredpixeldungeon.scenes;

import com.shatteredpixel.shatteredpixeldungeon.Assets;
import com.shatteredpixel.shatteredpixeldungeon.SPDSettings;
import com.shatteredpixel.shatteredpixeldungeon.ShatteredPixelDungeon;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.ui.Icons;
import com.shatteredpixel.shatteredpixeldungeon.ui.RenderedTextBlock;
import com.shatteredpixel.shatteredpixeldungeon.ui.StyledButton;
import com.shatteredpixel.shatteredpixeldungeon.ui.Window;
import com.shatteredpixel.shatteredpixeldungeon.Chrome;
import com.watabou.input.GameAction;
import com.watabou.input.KeyBindings;
import com.watabou.input.KeyEvent;
import com.watabou.input.PointerEvent;
import com.watabou.noosa.Camera;
import com.watabou.noosa.ColorBlock;
import com.watabou.noosa.Game;
import com.watabou.noosa.Group;
import com.watabou.noosa.Image;
import com.watabou.noosa.PointerArea;
import com.watabou.noosa.audio.Music;
import com.watabou.utils.Callback;
import com.watabou.utils.RectF;
import com.watabou.utils.Signal;

/**
 * Neukoelln: short picture-book intro (M41 kommt nicht, Keller, Fahrrad, Brandschutztuer).
 * Shown before every new game (normal, seeded and daily), can be paged with click/tap/any key
 * and skipped with the skip button or the back key. Each page has its own sound bed
 * (Assets.Music.INTRO_*), played through the regular music channel and music volume.
 */
public class IntroScene extends PixelScene {

	public static final int PAGES = Assets.Splashes.INTRO.length;

	//sound bed per page: rain at the bus stop, bus leaving, stairwell, fire door + cellar
	private static final String[] PAGE_MUSIC = {
			Assets.Music.INTRO_1, Assets.Music.INTRO_2, Assets.Music.INTRO_3, Assets.Music.INTRO_4};
	//null: the page track loops itself; otherwise it plays once and this loop takes over
	private static final String[] PAGE_MUSIC_AFTER = {
			null, Assets.Music.INTRO_1, null, Assets.Music.INTRO_KELLER};
	//fade of the previous bed when turning to this page (0 = hard cut, used for the door slam)
	private static final float[] PAGE_MUSIC_FADE = {0.6f, 0.15f, 0.45f, 0f};

	/** The intro is shown before every new game; the setting only records that it was seen once. */
	public static boolean showBeforeNewGame(){
		return true;
	}

	/** Entry point for all new-game buttons: Dungeon/InterlevelScene must already be prepared. */
	public static void startNewGame(){
		InterlevelScene.mode = InterlevelScene.Mode.DESCEND;
		if (showBeforeNewGame()){
			startGameAfter = true;
			Game.switchScene( IntroScene.class );
		} else {
			Game.switchScene( InterlevelScene.class );
		}
	}

	//true: continue into a freshly prepared game (InterlevelScene) when done
	//false: return to the title screen (replay from menu)
	public static boolean startGameAfter = true;

	private int page = 0;

	private Group panelLayer;
	private Image panel;
	//ignore key releases that started in the previous scene
	private float inputDelay = 0.3f;
	private RenderedTextBlock text;
	private RenderedTextBlock counter;
	private StyledButton btnNext;
	private StyledButton btnSkip;

	private Signal.Listener<KeyEvent> pageKeys;
	private boolean finished = false;

	//loop that takes over once a play-once page track has ended
	private String pendingLoop = null;

	@Override
	public void create() {
		super.create();

		uiCamera.visible = false;

		add(new ColorBlock(Camera.main.width, Camera.main.height, 0xFF000000));

		panelLayer = new Group();
		add(panelLayer);

		text = renderTextBlock(7);
		add(text);

		counter = renderTextBlock(6);
		counter.hardlight(0x999999);
		add(counter);

		btnNext = new StyledButton(Chrome.Type.GREY_BUTTON_TR, ""){
			@Override
			protected void onClick() {
				super.onClick();
				nextPage();
			}
		};
		btnNext.icon(Icons.get(Icons.ENTER));
		btnNext.textColor(Window.TITLE_COLOR);
		add(btnNext);

		btnSkip = new StyledButton(Chrome.Type.GREY_BUTTON_TR, Messages.get(this, "skip")){
			@Override
			protected void onClick() {
				super.onClick();
				finish();
			}
		};
		add(btnSkip);

		//any key except back pages forward (back = skip, via onBackPressed)
		KeyEvent.addKeyListener(pageKeys = new Signal.Listener<KeyEvent>() {
			@Override
			public boolean onSignal(KeyEvent event) {
				if (!event.pressed && !finished && inputDelay <= 0
						&& KeyBindings.getActionForKey(event) != GameAction.BACK){
					nextPage();
					return true;
				}
				return false;
			}
		});

		showPage(0);

		fadeIn();
	}

	private void showPage(int index){
		page = index;

		RectF insets = getCommonInsets();
		float w = Camera.main.width - insets.left - insets.right;
		float h = Camera.main.height - insets.top - insets.bottom;

		panelLayer.clear();

		panel = new Image(Assets.Splashes.INTRO[page]);
		//leave room for text and buttons below the picture
		float maxW = w - 16;
		float maxH = h - (landscape() ? 70 : 110);
		float scale = Math.min(maxW / panel.width, maxH / panel.height);
		if (scale > 1) scale = (float)Math.floor(scale); //keep pixel art crisp
		panel.scale.set(scale);
		panel.x = align(insets.left + (w - panel.width()) / 2f);
		panel.y = align(insets.top + 6);
		panelLayer.add(panel);

		panelLayer.add(new PointerArea(panel){
			@Override
			protected void onClick(PointerEvent event) {
				nextPage();
			}
		});

		text.text(Messages.get(this, "page" + (page + 1)), landscape() ? 220 : (int)(w - 16));
		text.setPos(align(insets.left + (w - text.width()) / 2f), align(panel.y + panel.height() + 6));

		counter.text((page + 1) + "/" + PAGES);

		btnNext.text(Messages.get(this, page == PAGES - 1 ? "start" : "next"));
		btnNext.setSize(btnNext.reqWidth() + 8, 20);
		btnSkip.setSize(btnSkip.reqWidth() + 8, 20);

		float btnY = Math.max(text.bottom() + 6, insets.top + h - 24);
		btnY = Math.min(btnY, insets.top + h - 22);
		btnNext.setPos(align(insets.left + w - btnNext.width() - 6), align(btnY));
		btnSkip.setPos(align(insets.left + 6), align(btnY));
		btnSkip.visible = btnSkip.active = page < PAGES - 1;
		counter.setPos(align(insets.left + (w - counter.width()) / 2f),
				align(btnY + (20 - counter.height()) / 2f));

		playPageMusic(page);
	}

	private void playPageMusic(final int index){
		pendingLoop = null;
		final String track = PAGE_MUSIC[index];
		final String after = PAGE_MUSIC_AFTER[index];
		Callback start = new Callback() {
			@Override
			public void call() {
				if (finished) return;
				Music.INSTANCE.play(track, after == null);
				pendingLoop = after;
			}
		};
		if (PAGE_MUSIC_FADE[index] > 0 && Music.INSTANCE.isPlaying()){
			Music.INSTANCE.fadeOut(PAGE_MUSIC_FADE[index], start);
		} else {
			start.call();
		}
	}

	private void nextPage(){
		if (finished) return;
		if (page + 1 < PAGES){
			showPage(page + 1);
		} else {
			finish();
		}
	}

	private void finish(){
		if (finished) return;
		finished = true;
		SPDSettings.introSequenceSeen(true);
		pendingLoop = null;
		if (startGameAfter){
			//the cellar loop keeps running under the region story in InterlevelScene,
			//GameScene then switches to the level music as usual (playLevelMusic)
			Callback cellar = new Callback() {
				@Override
				public void call() {
					Music.INSTANCE.play(Assets.Music.INTRO_KELLER, true);
				}
			};
			if (Music.INSTANCE.isPlaying()) {
				Music.INSTANCE.fadeOut(0.4f, cellar);
			} else {
				cellar.call();
			}
		} else {
			//back to the title: fade out, TitleScene starts its own tracks
			Music.INSTANCE.fadeOut(0.8f, new Callback() {
				@Override
				public void call() {
					Music.INSTANCE.end();
				}
			});
		}
		if (startGameAfter){
			InterlevelScene.mode = InterlevelScene.Mode.DESCEND;
			Game.switchScene(InterlevelScene.class);
		} else {
			startGameAfter = true;
			ShatteredPixelDungeon.switchScene(TitleScene.class);
		}
	}

	@Override
	public void update() {
		super.update();
		if (inputDelay > 0) inputDelay -= Game.elapsed;

		//play-once page track (bus, fire door) ended: continue with its loop
		if (pendingLoop != null && !finished && !Music.INSTANCE.paused() && !Music.INSTANCE.isPlaying()){
			String loop = pendingLoop;
			pendingLoop = null;
			Music.INSTANCE.play(loop, true);
		}
	}

	@Override
	protected void onBackPressed() {
		finish();
	}

	@Override
	public void destroy() {
		KeyEvent.removeKeyListener(pageKeys);
		super.destroy();
	}
}
