# No Stress Here 🫧

Silly little stress-relief games. Plain HTML/CSS/JS — no build step.

## Run
Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Structure
```
index.html              Home page (game list, Blobby the mascot)
assets/css/base.css     Shared theme (light default + dark), header, toast
assets/css/home.css     Home page styles
assets/js/theme.js      Light/dark toggle (saved per browser)
assets/js/home.js       Home page fun
assets/js/ads.js        Google AdSense slots (off until a publisher ID is set)
ads.txt                 AdSense ads.txt (fill in after approval)
games/pop-it/           Pop It game (index.html, pop-it.css, pop-it.js)
games/brick-breaker/    Brick Breaker (canvas game, procedural levels + bosses)
games/smash-it/         Smash It (3D: three.js + cannon-es; js/ = audio, face, world, buddy, tools, brutal, arena, fatality, game)
games/draw-and-play/     Draw & Play colouring book (js/art.js pages, engine.js paint engine, app.js UI)
games/sand-therapy/      Sand Therapy (3D kinetic sand: js/sand.js height-map engine, js/app.js tools & UI)
games/break-everything/  Break Everything (3D destruction: js/objects.js materials & fracture, world.js physics/rooms/replay, tools.js, game.js modes & stats)
games/sky-assault/       Sky Assault (vertical shooter on canvas: js/data.js content & stage generator, art.js sprites & terrain, engine.js, ui.js menus & saves)
games/firework-therapy/  Firework Therapy (canvas fireworks: js/fx.js engine, shapes & skies, audio.js, app.js modes, show creator & saves)
games/domino-universe/   Domino Universe (3D dominoes: js/data.js types, patterns & 20 levels, world.js physics/camera/replay, build.js tools, app.js modes & saves)
games/guess-who/         Guess Who? (clue quiz: js/core.js matching & categories, q-*.js question bank, app.js modes & progress)
games/hangman/           Hangman (js/words.js 520-word bank in 13 categories × 5 tiers, app.js modes, hints, shop & stats)
assets/vendor/          three.js r169 + cannon-es 0.20 wrapped as plain scripts (work from file://)
```

## Ads (Google AdSense)

Ad slots are already placed but stay hidden, and no Google script loads, until you switch them on:

1. Open `assets/js/ads.js` and set `CLIENT` to your publisher ID (`ca-pub-…`).
2. Create three display ad units in AdSense and paste their slot numbers into `SLOTS`
   (`home-mid`, `home-bottom`, `game-bottom`).
3. Replace the comment in `ads.txt` with the line AdSense gives you.

Where ads appear: two on the home page (one inside the game list, one under it) and one under the
content of game pages that scroll (menus and quizzes). Full-screen games never show an ad. There are no
pop-ups, sticky bars or Auto ads, slots load lazily once the page is idle, and their height is reserved
so nothing jumps. Ads only run over http(s), not when opening the files directly.
Preview the positions any time with `?adpreview=1` on a page URL.
If you serve visitors in the EEA/UK, set up a consent message in AdSense (Privacy & messaging).

## Adding a game
1. Copy `games/pop-it/` to `games/<new-game>/` and replace the board/JS.
2. Keep the shared header and `theme.js` / `base.css` includes so theming works.
3. Add a `.game-card` for it in `index.html`.

## Privacy (Smash It)
Uploaded face photos are processed in the browser tab only. They are never uploaded or saved
(not even to localStorage); Remove photo or closing the tab discards them.
Brutal mode and Fatality Mode never show the photo: they always switch to the drawn cartoon face.
