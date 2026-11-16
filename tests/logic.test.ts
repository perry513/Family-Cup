import { describe, expect, it } from 'vitest';
import { buildQueue, fits, maxCupPoints, placementPoints, targetWeights, weightedPick, wheelChance } from '../src/logic';
import { PUNISHMENTS } from '../src/punishments';
import type { Category } from '../src/types';

/** Deterministic random for repeatable tests. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

describe('placementPoints', () => {
  it('gives one point per player beaten', () => {
    expect(placementPoints([10, 30, 20, 0])).toEqual([1, 3, 2, 0]);
  });
  it('gives tied players the same points', () => {
    expect(placementPoints([5, 5, 1])).toEqual([1, 1, 0]);
    expect(placementPoints([2, 2])).toEqual([0, 0]);
  });
  it('doubles for the final game', () => {
    expect(placementPoints([3, 1], 2)).toEqual([2, 0]);
  });
});

describe('maxCupPoints', () => {
  it('counts the final game double', () => {
    expect(maxCupPoints(4, 5)).toBe(18);
    expect(maxCupPoints(2, 1)).toBe(1);
  });
});

describe('buildQueue', () => {
  const g = (id: string, category: Category = 'nerve') => ({ id, category });
  const pool = [g('a'), g('b', 'reflex'), g('c', 'eyes'), g('d')];

  it('plays every game once before any repeats', () => {
    for (let seed = 1; seed < 50; seed++) {
      const q = buildQueue(pool, 8, seeded(seed));
      expect(new Set(q.slice(0, 4)).size).toBe(4);
      expect(new Set(q.slice(4, 8)).size).toBe(4);
    }
  });
  it('never repeats a game back to back', () => {
    for (let seed = 1; seed < 50; seed++) {
      const q = buildQueue(pool, 12, seeded(seed));
      q.forEach((x, i) => i && expect(x).not.toBe(q[i - 1]));
    }
  });
  it('keeps reflex games apart when it can', () => {
    const two = [g('r1', 'reflex'), g('r2', 'reflex'), g('a'), g('b'), g('c'), g('d')];
    for (let seed = 1; seed < 50; seed++) {
      const q = buildQueue(two, 6, seeded(seed));
      q.forEach((x, i) => {
        if (x.category === 'reflex') expect(q.slice(Math.max(0, i - 2), i).some((y) => y.category === 'reflex')).toBe(false);
      });
    }
  });
  it('handles an empty pool', () => {
    expect(buildQueue([], 5)).toEqual([]);
  });
});

describe('wheelChance', () => {
  it('uses the base chance in a close game', () => {
    expect(wheelChance([3, 2, 1], 0)).toBe(0.4);
  });
  it('rises when someone pulls ahead', () => {
    expect(wheelChance([6, 3], 0)).toBe(0.7);
    expect(wheelChance([8, 3], 0)).toBe(1);
  });
  it('always spins after two games without a spin', () => {
    expect(wheelChance([1, 1], 2)).toBe(1);
  });
});

describe('targetWeights', () => {
  it('follows cup standing', () => {
    expect(targetWeights([1, 9, 5, 3])).toEqual([10, 40, 30, 20]);
  });
  it('shares the odds between tied players', () => {
    expect(targetWeights([4, 4, 0])).toEqual([40, 40, 20]);
  });
  it('halves the chance for whoever was punished last time', () => {
    expect(targetWeights([9, 1], [0])).toEqual([32.5, 35]);
  });
});

describe('weightedPick', () => {
  it('picks in proportion to weight', () => {
    expect(weightedPick([1, 3], () => 0.2)).toBe(0);
    expect(weightedPick([1, 3], () => 0.3)).toBe(1);
    expect(weightedPick([0, 0, 5], () => 0.99)).toBe(2);
  });
});

describe('punishments', () => {
  it('always leave at least 6 options for any game', () => {
    const tagSets = [['tap'], ['hold', 'zoneinfo'], ['tap', 'zoneinfo'], ['talk']] as const;
    for (const tags of tagSets) expect(PUNISHMENTS.filter((p) => fits(p, tags)).length).toBeGreaterThanOrEqual(6);
  });
  it('only offer a slowed button when time is measured', () => {
    expect(PUNISHMENTS.filter((p) => p.lag && fits(p, ['hold', 'zoneinfo']))).toEqual([]);
    expect(PUNISHMENTS.filter((p) => p.lag && fits(p, ['talk', 'tap']))).toEqual([]);
  });
  it('have unique ids', () => {
    expect(new Set(PUNISHMENTS.map((p) => p.id)).size).toBe(PUNISHMENTS.length);
  });
});

describe('Phase 2 game helpers', async () => {
  const { shadeSet } = await import('../src/games/list/its-the-same');
  const { extendSequence } = await import('../src/games/list/i-know-i-know');
  const { sixSevenStream } = await import('../src/games/list/six-seven');
  const { starSizes } = await import('../src/games/list/thats-not-fair');
  const { passOrder, CATEGORIES } = await import('../src/games/list/hurry-up');

  it('shadeSet gives 4 different colours including the target', () => {
    for (let seed = 1; seed < 40; seed++) {
      const { colors, target } = shadeSet(8, seeded(seed));
      expect(colors).toHaveLength(4);
      expect(new Set(colors).size).toBe(4);
      expect(colors).toContain(target);
    }
  });

  it('extendSequence never makes three of the same in a row', () => {
    for (let seed = 1; seed < 40; seed++) {
      const rand = seeded(seed);
      let seq: number[] = [];
      for (let k = 0; k < 8; k++) seq = extendSequence(seq, rand);
      expect(seq).toHaveLength(8);
      seq.forEach((x, i) => i >= 2 && expect(x === seq[i - 1] && x === seq[i - 2]).toBe(false));
    }
  });

  it('sixSevenStream has exactly one 6 then 7, at the target, and no repeats', () => {
    for (let seed = 1; seed < 200; seed++) {
      const { nums, target } = sixSevenStream(seeded(seed));
      const hits = nums.flatMap((d, i) => (i > 0 && nums[i - 1] === 6 && d === 7 ? [i] : []));
      expect(hits).toEqual([target]);
      nums.forEach((d, i) => i && expect(d).not.toBe(nums[i - 1]));
      expect(nums.length - target).toBeGreaterThanOrEqual(4);
    }
  });

  it('starSizes favours whoever is behind', () => {
    expect(starSizes([3, 3, 3])).toEqual([0.38, 0.38, 0.38]);
    const s = starSizes([10, 0, 5]);
    expect(s[0]).toBeLessThan(s[2]!);
    expect(s[2]).toBeLessThan(s[1]!);
  });

  it('passOrder goes clockwise round the corners with 4 players', () => {
    expect(passOrder(4)).toEqual([0, 1, 3, 2]);
    expect(passOrder(3)).toEqual([0, 1, 2]);
  });

  it('has enough distinct categories for a cup', () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(20);
  });
});

describe('Phase 3 game helpers', async () => {
  const { makeOrder, checkTaps } = await import('../src/games/list/but-you-said');
  const { roundTags, TAGS } = await import('../src/games/list/thats-mine');
  const { quizOptions, MEMO_ITEMS } = await import('../src/games/events/i-forgot');
  const { withArticle } = await import('../src/games/pads');

  it('But you said: following the order is ok, anything else is wrong', () => {
    for (let level = 0; level <= 4; level++) {
      for (let seed = 1; seed < 30; seed++) {
        const o = makeOrder(level, seeded(seed * 7 + level));
        if (Array.isArray(o.expect)) {
          expect(checkTaps(o, o.expect)).toBe('ok');
          expect(checkTaps(o, o.expect.slice(0, -1))).toBe(o.expect.length > 1 ? 'more' : 'more');
          const wrong = (o.expect[0]! + 1) % 4;
          expect(checkTaps(o, [wrong])).toBe('wrong');
        } else {
          expect(checkTaps(o, [o.expect.not])).toBe('wrong');
          expect(checkTaps(o, [(o.expect.not + 1) % 4])).toBe('ok');
        }
      }
    }
  });

  it('But you said: from level 1 the colour words are painted in the wrong colour', () => {
    const o = makeOrder(2, seeded(3));
    const inks = [...o.html.matchAll(/color:(#[0-9a-f]+)">(\w+)</g)];
    const colourOf: Record<string, string> = { RED: '#ff5d62', BLUE: '#3fa2ff', GREEN: '#38d273', YELLOW: '#ffc526' };
    expect(inks.length).toBe(2);
    for (const [, ink, word] of inks) expect(ink).not.toBe(colourOf[word!]);
  });

  it("That's mine: tags are never all the same and apply sensibly", () => {
    for (let seed = 1; seed < 30; seed++) expect(new Set(roundTags(3, seeded(seed))).size).toBeGreaterThan(1);
    expect(TAGS.map((t) => t.apply(10))).toEqual([13, 15, 8, 6, 20, 5]);
    expect(TAGS[3]!.apply(2)).toBe(0); // never below zero
  });

  it('I forgot: quiz has 6 different options including the answer', () => {
    const answer = MEMO_ITEMS[0]!;
    const opts = quizOptions(answer, [MEMO_ITEMS[1]!, MEMO_ITEMS[2]!]);
    expect(opts).toHaveLength(6);
    expect(new Set(opts).size).toBe(6);
    expect(opts).toContain(answer);
    expect(opts).toContain(MEMO_ITEMS[1]);
  });

  it('uses "an" before vowels', () => {
    expect(withArticle('umbrella')).toBe('an umbrella');
    expect(withArticle('banana')).toBe('a banana');
  });
});

describe('Phase 4 content', async () => {
  const { WORD_SETS } = await import('../src/games/list/what-is-that');

  it('every drawing set has 6 different things', () => {
    expect(WORD_SETS.length).toBeGreaterThanOrEqual(4); // enough for every player to draw a different set
    for (const set of WORD_SETS) {
      expect(set).toHaveLength(6);
      expect(new Set(set.map((x) => x[1])).size).toBe(6);
    }
  });
});

describe('every mini game', async () => {
  const { games } = await import('../src/games');

  it('has a unique id, a name, 2-3 rule lines and at least one tag', () => {
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
    for (const g of games) {
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.how.length).toBeGreaterThanOrEqual(2);
      expect(g.how.length).toBeLessThanOrEqual(3);
      expect(g.tags.length).toBeGreaterThan(0);
    }
  });
});
