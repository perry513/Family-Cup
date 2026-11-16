/**
 * The four colour pads shared by several games. Shapes look the same upside down,
 * so players across the table see the same thing.
 */
export const PADS = [
  { color: '#ff5d62', shape: '●', word: 'RED' },
  { color: '#3fa2ff', shape: '■', word: 'BLUE' },
  { color: '#38d273', shape: '◆', word: 'GREEN' },
  { color: '#ffc526', shape: '✚', word: 'YELLOW' },
] as const;

/** One pad. `hit` makes it touchable inside a player's zone. */
export const padHtml = (k: number, hit: boolean): string =>
  `<div class="pad${hit ? ' hit' : ''}" data-k="${k}" style="--pc:${PADS[k]!.color}">${PADS[k]!.shape}</div>`;

export const padsHtml = (hit: boolean): string => `<div class="pads">${PADS.map((_, k) => padHtml(k, hit)).join('')}</div>`;

/** Fun objects used by several games: [emoji, name]. */
export const THINGS: readonly (readonly [string, string])[] = [
  ['🍌', 'banana'],
  ['🧸', 'teddy bear'],
  ['🔦', 'torch'],
  ['🍕', 'pizza'],
  ['🐸', 'frog'],
  ['🪥', 'toothbrush'],
  ['🎸', 'guitar'],
  ['🧦', 'smelly sock'],
  ['🦖', 'dinosaur'],
  ['🍩', 'donut'],
  ['🎈', 'balloon'],
  ['🧲', 'magnet'],
  ['🥾', 'boot'],
  ['🐟', 'fish'],
  ['🍦', 'ice cream'],
  ['📚', 'pile of books'],
  ['🪣', 'bucket'],
  ['🧻', 'toilet roll'],
  ['🎁', 'present'],
  ['🛹', 'skateboard'],
  ['🦄', 'unicorn'],
  ['🍪', 'cookie'],
  ['⚽', 'football'],
  ['🎩', 'top hat'],
  ['🐢', 'turtle'],
  ['🌂', 'umbrella'],
  ['🥕', 'carrot'],
  ['🪀', 'yo-yo'],
];

/** "a banana", "an umbrella". */
export const withArticle = (name: string): string => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
