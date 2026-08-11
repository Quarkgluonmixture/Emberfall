/**
 * Tintable UI icons (white SVG glyphs in public/assets/icons/, CC BY 3.0 —
 * see icons/ATTRIBUTION.md). Rendered as CSS masks filled with currentColor,
 * so they inherit the text color of whatever they sit in.
 */
import type { Season } from '../core/types';

/**
 * Custom-property url() tokens are resolved where var() is consumed, i.e. the
 * stylesheet URL, not where the inline variable was authored. Resolve the
 * public asset directory to an absolute URL up front so Vite's relative base
 * also works when Emberfall is hosted below the origin root (e.g. /Emberfall/).
 */
const ICON_BASE = new URL('assets/icons/', document.baseURI).href;

/** Chronicle kinds that ship a matching event_<kind>.svg. */
const EVENT_ICON_KINDS = new Set([
  'warDeclared',
  'skirmish',
  'capture',
  'plague',
  'plagueEnd',
  'famine',
  'famineEnd',
  'wildfire',
  'flood',
  'goldenAge',
  'collapse',
  'civFell',
  'migration',
  'schism',
  'succession',
  'founding',
  'village',
  'town',
  'peace',
  'alliance',
  'tradeOpened',
  'rivalry',
  'incidentBad',
  'incidentGood',
]);

/** Kinds without their own file borrow a thematic neighbor (full file stems). */
const EVENT_ICON_ALIASES: Record<string, string> = {
  wildfireWild: 'event_wildfire',
  rebirth: 'event_founding',
  resettleRuin: 'event_migration',
  relationsCooled: 'season_winter',
  treatySigned: 'event_peace',
  tributeEnds: 'event_tradeOpened',
};

const SEASON_ICONS = ['season_spring', 'season_summer', 'season_autumn', 'season_winter'] as const;

/** A tintable icon span; `file` is the icon filename without extension. */
export function iconHtml(file: string, cls = ''): string {
  return `<span class="gicon${cls ? ` ${cls}` : ''}" style="--icon:url('${ICON_BASE}${file}.svg')"></span>`;
}

/** Icon for a chronicle event kind, or '' when the kind has no glyph. */
export function eventIconHtml(kind: string, cls = ''): string {
  const file = EVENT_ICON_KINDS.has(kind) ? `event_${kind}` : EVENT_ICON_ALIASES[kind];
  return file ? iconHtml(file, cls) : '';
}

export function seasonIconHtml(season: Season, cls = ''): string {
  return iconHtml(SEASON_ICONS[season], cls);
}
