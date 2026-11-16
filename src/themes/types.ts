/**
 * Hero contract, shared with Quoridor Clash. To add a hero, add ONE folder
 * src/themes/heroes/<id>/ whose index.ts default-exports a HeroDefinition;
 * the registry picks it up automatically.
 *
 * SVG rules: markup is a fragment (no <svg>, <defs>, <script>, <image>, <text>,
 * external URLs). Gradients/filters go in `defs`, with every id prefixed
 * "<hero id>-". Ids starting with "sh-" are shared (see shared-defs.ts).
 */

export interface SvgArt {
  /** Gradient/filter elements (no <defs> wrapper), ids prefixed "<id>-". */
  defs?: string;
  /** Drawing fragment. */
  markup: string;
}

export interface HeroDefinition {
  /** Unique, lowercase kebab-case. Used as id prefix for defs. */
  id: string;
  name: string;
  /** Short role shown under the name, e.g. "Brave Knight". */
  title: string;
  /** Signature colour (hex). Used as the player's colour. */
  color: string;
  /** Sort order in the roster (lower first). */
  order?: number;
  /** Head-and-shoulders portrait in a 0 0 100 100 box (shown in round frames). */
  portrait: SvgArt;
  /** Optional full-body figure (used by Quoridor Clash; ignored here). */
  figure?: SvgArt;
}
