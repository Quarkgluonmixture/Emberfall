/** Debug overlay: FPS, entity counts, simulation timing, active systems. */

export interface DebugInfo {
  fps: number;
  day: number;
  entities: number;
  agents: number;
  settlements: number;
  civsAlive: number;
  population: number;
  tickMs: number;
  timings: Record<string, number>;
  terrainVersion: number;
  territoryVersion: number;
}

export class DebugOverlay {
  visible = false;
  /** Persistent extra text appended below the live stats (e.g. stress reports). */
  extra = '';
  private root: HTMLElement;

  constructor() {
    this.root = document.getElementById('debug')!;
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.root.classList.toggle('hidden', !this.visible);
  }

  update(info: DebugInfo): void {
    if (!this.visible) return;
    const systems = Object.entries(info.timings)
      .map(([name, ms]) => `  ${name.padEnd(10)} ${ms.toFixed(2)}ms`)
      .join('\n');
    this.root.textContent =
      `FPS         ${info.fps.toFixed(0)}\n` +
      `day         ${info.day}\n` +
      `entities    ${info.entities}\n` +
      `agents      ${info.agents}\n` +
      `settlements ${info.settlements}\n` +
      `civs alive  ${info.civsAlive}\n` +
      `population  ${info.population}\n` +
      `tick        ${info.tickMs.toFixed(2)}ms\n` +
      `versions    terrain ${info.terrainVersion} / territory ${info.territoryVersion}\n` +
      `active systems:\n${systems}` +
      (this.extra ? `\n\n${this.extra}` : '');
  }
}
