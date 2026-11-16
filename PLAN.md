# Family Cup: build phases

A web game for 2–4 players sharing one tablet, fair for ages 8 and up. The family plays a run of mini games, each named after a phrase kids say, and the highest score wins the Family Cup.

Status: All four phases built (2026-11-16). Phases 1 and 2 were tested on the tablet by the family. Phases 3 and 4 were built overnight and tested only in a desktop browser with automated play-throughs (2, 3 and 4 players); they still need family testing.

Changes from family testing so far:
- Scores lanes end at the cup; the winner lands on it at the end.
- 🏠 button returns to the main menu (asks first); during a game it is replaced by a big ⏸ pause button that freezes every timer and blocks taps until Resume.
- The intro speaks only the game name; a "🔊 Read the rules" button reads the rules on request.
- Host voice: 5 fun host characters (🍅 Tomato, 🐸 Frog, 🐉 Dragon, 🐭 Mouse, 🦉 Owl) or Voice off, picked on setup. Built from the device's best voices.
- "Junior boost" renamed "Kid power".
- "Robot voice only" punishment replaced by "Hold your nose while you talk".
- "Hurry up!": the player holding the bomb gets an explosion animation instead of a dark zone.
- "Six… seven!": a round ends as soon as nobody can score any more.
- "I know, I know!": no knock-outs; everyone plays every round (3 to 8 colours) and scores the colours they got right.

**Stack:** Vite + TypeScript, deployed to GitHub Pages by a GitHub Actions workflow (same setup as Quoridor Clash). Heroes are shared with Quoridor Clash: same folder format, copied across.

## Phase 1: A playable cup (built)

Goal: the family can play a full cup from setup to trophy.

Not done in Phase 1: animated how-to-play demos (the intro shows and speaks 3 short lines instead), and the "Look away!" moment, which moves to Phase 3 where the first games that need it are.

- **Game look and feel** across all screens (see "Look and feel" below), including sound effects and app install.
- **Cup setup**
  - 2–4 players, each picking a hero from Quoridor Clash; the hero's colour is the player's colour; no two players share a hero.
  - Players choose how many games to play.
  - Tappable game tiles to switch individual games off.
  - Optional Kid power per player.
- **Screen layout** (see "Screen layout" below): 2 or 3 players along one edge with the stage on top; 4 players in the four corners with the stage in the middle.
- **Scoring:** one point for every player you beat in a mini game; ties score the same; the final game counts double.
- **Between games:** a lane for each player, with a marker that slides forward by the points just won.
- **Punishment wheel:** both spins, the hidden trigger rule and the punishment pool (see "Punishment wheel" below).
- **Trophy ceremony** with a rematch button.
- **Four games** (finish and tune the prototypes):
  - "Wait for it…": stop your hidden clock closest to the target time.
  - "I was first!": tap when the light turns green; add fake-outs so it rewards self-control.
  - "Are we there yet?": tap when the invisible car is in the target zone.
  - "Not my fault!": hold to bank points; lose them if the tower falls on your turn.

## Phase 2: Five more small games (built)

Goal: nine games, so cups feel varied.

- "It's the same!": see a colour, then pick it from close shades.
- "I know, I know!": repeat a growing colour sequence (up to 9).
- "Six… seven!": tap only when a 6 is followed directly by a 7.
- "That's not fair!": a tapping race rigged against the cup leader.
- "Hurry up!": the ticking bomb; say a word in the category and pass it on. Needs a list of kid-friendly categories.

## Phase 3: Four medium games (built, not yet family-tested)

This phase also built the "Look away!" moment (see "Secrets" below).

- "But you said…!": everyone follows a written colour order on their own pads ("Tap BLUE 2 times", "Tap anything but RED", "Tap the colour of this word"). Colour words are printed in the wrong colours. 6 rounds, harder each time. Not spoken, because hearing it would remove the trick.
- "That's mine!": things fly into the middle with a silly prompt; each player grabs one in their own zone (first finger wins). Hidden tags flip: +3, +5, −2, −4, ×2, ÷2 on a starting 10 points. 4 rounds.
- "I forgot!": a between-games event with its own on/off tile, not a queued game. A picture to remember at the start; surprise pop quizzes between games (35% chance, and always one before the final game). Same 6 options in every zone, shuffled. Right answer = +1 cup point.
- "You're lying!": each player is teller once. Teller holds to peek at a card (TRUTH or LIE, and what to say); everyone else votes. Right vote +1; teller +1 per player fooled.

## Phase 4: Two large games (built, not yet family-tested)

- "You cheated!": 5 rounds; each plays a scene that cheats about half the time. Scenes: counting up (skips a number), a race (a runner teleports ahead), cups shuffle with top hats (the ball ends up under the wrong hat). First to slam after a cheat +2, others in time +1, false alarm −1 and out for the round.
- "What IS that?!": each player draws once. The drawer peeks at the word, then draws on the stage with a finger (45 s, "Start again" button). Others pick from 6 look-alike options: first right 3, then 2, then 1; a wrong guess is out for that drawing. Drawer +1 per right guesser.

## Optional later: Game board

Replace the lanes with a winding track of tiles (wheel, quiz and bonus tiles). Scoring stays the same, so it can be added at any point without redoing earlier work. It is roughly as much work as two or three mini games.

## Settled rules

### Look and feel: a game, not a website

This applies to every screen in every phase. The current prototype does not meet it (its setup is a form and its results are a table) and will be restyled in Phase 1.

- **Full screen, no scrolling:** every screen fits the tablet exactly; no browser bars, text selection or zooming.
- **No form controls:** no text boxes, checkboxes, dropdowns or tables. Players tap to pick a character and colour; game count uses big plus and minus buttons; names are optional.
- **Chunky, toy-like buttons:** big rounded shapes with thick outlines that squash when pressed.
- **Everything moves:** screens bounce in, scores count up, markers hop along lanes, the wheel ticks as it spins, winners get confetti.
- **Sound on every action:** taps, countdown beeps, win jingle, wrong-answer buzz, wheel drum roll, all generated in the browser.
- **Characters instead of labels:** each player is an animal or creature in their colour, shown in their zone, on the lanes and at the ceremony.
- **Game-show host voice:** short spoken lines; how-to-play is a quick animated demo with one line of words.
- **One bold look:** bright cartoon colours on a dark background, one playful rounded typeface, big numbers.
- **Installs like an app:** opens full screen from the tablet's home screen with its own icon, and works offline.

### Screen layout

- **2 or 3 players:** everyone sits on one side. The shared stage fills the top of the screen and the player zones sit in an even row along the bottom.
- **4 players:** one zone in each corner, with the top two flipped to face the players opposite. The shared stage fills the middle.
- Every game must work in both layouts. The stage only shows things that read from any side (lights, the car, the tower, colours, big digits); anything that must be read goes inside each player's zone.
- A player's whole zone is their button. It shows their name, one big line and one small line.

### Secrets

- When one player needs to see something secret, the tablet says out loud who should look away.
- The secret shows only while that player presses and holds their zone.
- A chime and a spoken "eyes back" tell the others when to look again.
- Used by "You're lying!" (the teller's card) and "What IS that?!" (the word to draw).
- Possible later mode for "You cheated!": a secret player-cheater and a vote, for 3 or more players.

### Fair for all ages

- Games are designed to be age-neutral first: placement scoring, short rounds, luck and nerve mixed with skill, pictures instead of words, spoken instructions.
- Each cup draws games from every category (reflex, memory, nerve/luck, sharp eyes, talking), with no more than one reflex game in three.
- Kid power is an optional extra that only affects the two reflex games ("I was first!" and "Six… seven!").
- Talking games rely on family honesty, with a "Nope!" button to challenge a bad answer.

### Punishment wheel

- **When it appears** (hidden from players):
  - 40% chance after each game.
  - 70% if 1st place leads 2nd by 3 or more points; always if the lead is 5 or more.
  - Always after two games in a row without a spin.
  - Never after the final game.
- **Spin 1, what happens:** about 10 slices: 6 punishments, 3 blanks, 1 "Everybody!" (every player is dealt a different punishment).
- **Spin 2, who gets it:** weighted by cup standing.

  | Players | 1st | 2nd | 3rd | 4th |
  |---|---|---|---|---|
  | 4 | 40% | 30% | 20% | 10% |
  | 3 | 50% | 30% | 20% | |
  | 2 | 65% | 35% | | |

  Tied players get equal slices. A player punished last time has their slice halved.
- A punishment lasts for the next game only, and the wheel only offers punishments that make sense for that game.
- The winner of the mini game presses the spin button.
- **Punishment pool**
  - Enforced by the tablet: blacked-out zone with brief peeks, shrunken button, upside-down zone, sleepy button (+0.3 s, timed games only), drifting button.
  - Honour system: pinky only, wrong hand, elbow only, one eye shut, hands on head until "go", standing on one leg, whisper only, hold your nose while you talk.

All the wheel numbers are starting guesses to tune after the family has played.

## Open decisions

- Family testing of Phases 3 and 4, then tuning: round counts, timings, wheel odds, quiz frequency.
- Whether to add the game board later.
- Publishing to GitHub Pages (needs a GitHub repo; nothing has been pushed).
