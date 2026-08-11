import { describe, expect, it } from 'vitest';
import { eventIconHtml, seasonIconHtml } from '../src/ui/icons';

describe('icon helpers', () => {
  it('remain importable in the node test environment without a DOM', () => {
    expect(eventIconHtml('rebirth')).toContain("assets/icons/event_founding.svg");
    expect(eventIconHtml('treatySigned')).toContain("assets/icons/event_peace.svg");
  });

  it('renders season icon paths through the same public asset base', () => {
    expect(seasonIconHtml(3)).toContain("assets/icons/season_winter.svg");
  });
});
