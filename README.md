# Family Cup

A party game for 2–4 players sharing one tablet, fair for ages 8 and up. Play a cup of
quick mini games, each named after something kids say. Win games to move up the lanes, watch out
for the punishment wheel, and whoever has the most points at the end wins the Family Cup.

The full design and build phases are in [PLAN.md](PLAN.md).

## How to play

1. **Pick your heroes.** Up to 4 players. Tap a hero, or use the arrows, to change it. Each hero's colour becomes your colour.
2. **Sit in the right place.** With 2 or 3 players, everyone sits along the bottom edge. With 4, take a corner each.
3. **Choose how many games** (3–12) and switch off any games you don't want.
4. **Play.** Your whole coloured zone is your button.
5. **Score.** In each game you get one point for every player you beat. The final game counts double.
6. **The wheel.** Sometimes the punishment wheel appears between games. It is more likely when someone is far ahead,
   and the leader is the most likely to get the punishment.

**Kid power** (per player, optional): a small head start in the reflex games only.

**Host voice:** tap the voice button on the setup screen to pick a host (🍅 Tomato, 🐸 Frog, 🐉 Dragon, 🐭 Mouse, 🦉 Owl) or turn the voice off.
The voices come from the tablet's own text-to-speech, so installing better voices on the tablet makes them sound better.

## Mini games

| Game | What you do |
|---|---|
| Wait for it… | Stop a clock that disappears, as close to the target time as you can. |
| I was first! | Tap when the light turns green. Blue and yellow flashes are tricks. |
| Are we there yet? | Tap when the invisible car is in the green zone. |
| Not my fault! | Take turns holding to bank points. If the tower falls on your turn, you lose them. |
| It's the same! | A colour flashes, then hides. Find the exact same shade in your zone. |
| I know, I know! | Repeat a growing colour sequence on your own pads. A mistake only costs you that round. |
| Six… seven! | Tap only when a 7 comes straight after a 6. A wrong tap freezes you. |
| That's not fair! | Tap your star for 15 seconds. Rigged: the leader's star is tiny, last place's is huge. |
| Hurry up! | Say something in the category, then pass the bomb. Others can call NOPE! |
| But you said…! | Do exactly what the order says on your colour pads. The colour words are painted in the wrong colours. |
| That's mine! | Grab one thing in your zone, first finger wins. Each thing hides +3, +5, −2, −4, ×2 or ÷2. |
| You're lying! | The teller peeks at a secret card while everyone else looks away, then the others vote: truth or lie? |
| You cheated! | Watch the tablet. If it cheats (skips a number, a runner teleports, the ball changes hat), slam your zone first. |
| What IS that?! | The drawer secretly sees a word and draws it in the middle; everyone else picks the answer from look-alikes. |

**I forgot!** (between games, can be switched off): remember a picture at the start of the cup; surprise pop quizzes
come between games, and a right answer is worth 1 cup point.

During a game, the big ⏸ button pauses everything. Between games, the 🏠 button goes back to the main menu (it asks first).

## Development

Needs Node.js 24 or newer.

```sh
npm install      # install dependencies
npm run dev      # dev server, also reachable from a tablet on the same Wi-Fi
npm test         # unit tests (Vitest)
npm run build    # type-check and build the static site into dist/
npm run preview  # serve the built site locally
```

On Windows, run the commands from `C:\...` with a capital drive letter. Vitest fails to start
("Cannot read properties of undefined (reading 'config')") when the folder is opened as `c:\...`.

Stack: Vite, TypeScript (strict), Vitest. No UI framework.

## Hosting on GitHub Pages

The site builds with relative paths, so it works under any repo name.

1. Push this folder to a GitHub repo, on the `main` branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Each push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which tests, builds and deploys `dist/`.

On the tablet, open the site and use **Add to Home Screen**. It then opens full screen and works offline.

## Project structure

```
src/
  main.ts            Entry point: setup → cup → ceremony loop
  cup.ts             One cup: intro, game, scores, punishment wheel
  logic.ts           Pure rules: scoring, game order, wheel odds (unit-tested)
  punishments.ts     Punishment pool
  audio.ts           Sound effects (generated, no files) and host voice
  store.ts           Remembers the last setup on this tablet
  games/list/        One file per mini game (auto-registered)
  games/events/      Between-games events such as the "I forgot!" pop quiz (auto-registered)
  games/pads.ts      Shared colour pads and objects used by several games
  themes/heroes/     One folder per hero (same format as Quoridor Clash)
  ui/                Setup, arena, between-game screens, wheel
  styles/style.css   All styles
tests/               Vitest unit tests
public/              Manifest, icon, service worker (copied as-is)
```

### Add a mini game

Add one file in `src/games/list/` that default-exports a `MiniGame` (see `src/types.ts`). It shows
up on the setup screen automatically. Return a score per player (higher is better); the cup
turns it into placement points. Set `tags` so the wheel only offers punishments that make sense.

### Add a hero

Copy a hero folder from Quoridor Clash into `src/themes/heroes/`, or make one in the same format
(`index.ts` plus `portrait.svg` and `portrait.defs.svg`, gradient ids prefixed `<id>-`).
