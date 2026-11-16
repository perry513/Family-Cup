import { say, sfx } from '../../audio';
import { shuffle } from '../../logic';
import type { MiniGame } from '../../types';
import { lookAway } from '../../ui/lookaway';
import { esc, later, sleep } from '../../util';
import { THINGS, withArticle } from '../pads';

const VOTE_MS = 20000;

const game: MiniGame = {
  id: 'youre-lying',
  name: "You're lying!",
  icon: '🤥',
  order: 12,
  category: 'talk',
  tags: ['tap', 'hold', 'talk', 'zoneinfo'],
  how: [
    'Take turns being the teller. Everyone else looks away while the teller holds their zone to peek at a secret card.',
    'The card says TELL THE TRUTH or LIE, and what to say. The teller says it out loud.',
    'Everyone else votes: truth or lie? Right guess +1. The teller gets +1 for every player they fool.',
  ],

  async run(a) {
    const pts = Array<number>(a.n).fill(0);
    const first = Math.floor(Math.random() * a.n);
    const cards = shuffle(THINGS);
    for (let turn = 0; turn < a.n; turn++) {
      const t = (first + turn) % a.n;
      const teller = a.players[t]!.hero.name;
      const truth = Math.random() < 0.5;
      const actual = cards[turn * 2 % cards.length]!;
      const claim = truth ? actual : cards[(turn * 2 + 1) % cards.length]!;

      await lookAway(
        a,
        t,
        `<div class="cardbox">
           <div class="cardpic">${actual[0]}</div>
           <div class="cardname">Your card: ${esc(withArticle(actual[1]))}</div>
           <div class="verdict ${truth ? 'truth' : 'lie'}">${truth ? '😇 TELL THE TRUTH' : '😈 LIE!'}</div>
           <div class="cardsay">Say: “I have ${esc(withArticle(claim[1]))}!”</div>
         </div>`,
      );

      // The teller speaks; everyone else votes.
      a.stage.innerHTML = `<div class="lookaway">🗣️<div>${esc(teller)}, what's on your card?</div></div>`;
      say(`${teller}, what's on your card?`);
      const votes: ('truth' | 'lie' | null)[] = a.players.map(() => null);
      for (let j = 0; j < a.n; j++) {
        if (j === t) {
          a.mark(j, 'active');
          a.big(j, '🗣️');
          a.sub(j, 'Say what your card told you!');
        } else {
          a.big(j, '');
          a.sub(j, `Is ${teller} telling the truth?`);
          a.pane(j).innerHTML = '<div class="votes"><div class="btn vote hit" data-v="truth">😇 Truth</div><div class="btn vote hit" data-v="lie">😈 Lie</div></div>';
        }
      }
      await new Promise<void>((resolve) => {
        const cancelTimer = later(() => finish(), VOTE_MS);
        const finish = () => {
          off();
          cancelTimer();
          resolve();
        };
        const off = a.taps((j, _t, target) => {
          const v = target.closest<HTMLElement>('.vote');
          if (!v || j === t || votes[j]) return;
          votes[j] = v.dataset.v === 'truth' ? 'truth' : 'lie';
          sfx.tap();
          a.pane(j).innerHTML = '';
          a.big(j, '🤐');
          a.sub(j, 'Voted!'); // keep it secret so nobody copies
          if (votes.every((x, k) => k === t || x)) finish();
        });
      });

      // Reveal.
      a.clearMarks();
      a.stage.innerHTML = `<div class="cardreveal"><div class="cardpic">${actual[0]}</div><div class="stamp ${truth ? 'truth' : 'lie'}">${truth ? 'TRUTH' : 'LIE'}</div></div>`;
      say(truth ? 'It was the truth!' : 'It was a lie!');
      let fooled = 0;
      for (let j = 0; j < a.n; j++) {
        a.pane(j).innerHTML = '';
        if (j === t) continue;
        const right = votes[j] === (truth ? 'truth' : 'lie');
        if (right) {
          pts[j] = pts[j]! + 1;
          a.big(j, '✔ +1');
          a.sub(j, 'You got it!');
          a.mark(j, 'win');
        } else {
          fooled++;
          a.big(j, votes[j] ? '✘' : '⏰');
          a.sub(j, votes[j] ? 'Fooled!' : 'No vote');
          a.mark(j, 'dim');
        }
      }
      pts[t] = pts[t]! + fooled;
      a.big(t, `+${fooled}`);
      a.sub(t, fooled ? `You fooled ${fooled}!` : 'Nobody was fooled');
      if (fooled) a.mark(t, 'win');
      sfx.good();
      await sleep(3800);
    }
    return { scores: pts, labels: pts.map((p) => `${p} points`) };
  },
};

export default game;
