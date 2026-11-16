/**
 * Heroes: auto-registered from src/themes/heroes/<id>/index.ts (same format as
 * Quoridor Clash, so hero folders can be copied between the two games).
 */
import type { HeroDefinition } from './types';
import artistDefs from './shared.defs.svg?raw';

export type { HeroDefinition } from './types';

const modules = import.meta.glob<HeroDefinition>('./heroes/*/index.ts', { eager: true, import: 'default' });

const ord = (h: HeroDefinition): number => h.order ?? Number.POSITIVE_INFINITY;

export const heroes: readonly HeroDefinition[] = Object.freeze(
  Object.values(modules)
    .filter((h): h is HeroDefinition => !!h && typeof h === 'object')
    .sort((a, b) => ord(a) - ord(b) || a.name.localeCompare(b.name)),
);

if (heroes.length < 4) throw new Error('Family Cup needs at least 4 heroes');

const byId = new Map(heroes.map((h) => [h.id, h] as const));

/** Hero by id, or undefined. */
export function findHero(id: string | null | undefined): HeroDefinition | undefined {
  return id ? byId.get(id) : undefined;
}

const CLIP = 'sh-portrait-clip';

/** Inner markup for one hidden <svg><defs>: shared defs plus every hero's defs. Inject once. */
export function allDefsMarkup(): string {
  const parts = [
    `<clipPath id="${CLIP}" clipPathUnits="userSpaceOnUse"><circle cx="50" cy="50" r="50"/></clipPath>`,
    artistDefs,
    ...heroes.map((h) => h.portrait.defs ?? ''),
  ];
  return parts.map((p) => p.trim()).filter(Boolean).join('\n');
}

/** Portrait content for a 0 0 100 100 box: clipped circle on the hero colour. */
export function portraitMarkup(hero: HeroDefinition): string {
  return (
    `<g clip-path="url(#${CLIP})">` +
    `<rect width="100" height="100" fill="${hero.color}"/>` +
    `<rect width="100" height="100" fill="url(#sh-bd-light)"/>` +
    `<rect width="100" height="100" fill="url(#sh-bd-dark)"/>` +
    hero.portrait.markup +
    `</g>`
  );
}

/** Round portrait as a standalone <svg>. */
export function portraitSvg(hero: HeroDefinition, className = 'portrait'): string {
  return `<svg viewBox="0 0 100 100" class="${className}" aria-hidden="true" focusable="false">${portraitMarkup(hero)}</svg>`;
}
