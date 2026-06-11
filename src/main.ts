/**
 * Emberfall bootstrap: owns the game loop, time controls, input and UI wiring.
 * Simulation advances in fixed whole-day steps; rendering and agents are
 * frame-rate driven and purely observational.
 */
import type { Ticker } from 'pixi.js';
import { BALANCE } from './config/balance';
import { hasSave, loadFromLocalStorage, saveToLocalStorage } from './persist/save';
import { Renderer } from './render/renderer';
import { AgentSystem } from './sim/agents';
import { Simulation } from './sim/simulation';
import { dateString, seasonOf } from './sim/time';
import { weatherForDay, type Weather } from './sim/weather';
import { ChroniclePanel } from './ui/chroniclePanel';
import { CivPanel } from './ui/civPanel';
import { DebugOverlay } from './ui/debugOverlay';
import { HistoryPanel } from './ui/historyPanel';
import { Hud } from './ui/hud';
import { Inspector } from './ui/inspector';

const DEFAULT_SEED = 1337;

let sim: Simulation;
let renderer: Renderer | null = null;
let agents = new AgentSystem();
let chroniclePanel = new ChroniclePanel();
let historyPanel = new HistoryPanel();

let speedIndex = 1;
let lastRunningSpeed = 1;
/** Ambient (visual) day fraction: 0 = midnight, 0.5 = noon. */
let ambient = 0.35;
let uiTimer = 0;
let agentSyncTimer = 0;

const inspector = new Inspector();
const civPanel = new CivPanel((civId) => inspector.select({ kind: 'civ', id: civId }));
const debugOverlay = new DebugOverlay();

const hud = new Hud({
  onSpeed: setSpeed,
  onSave: () => {
    if (saveToLocalStorage(sim.state)) hud.showToast('The chronicle is preserved.');
    else hud.showToast('Saving failed — storage unavailable.');
  },
  onLoad: () => {
    if (!hasSave()) {
      hud.showToast('No saved world found.');
      return;
    }
    const loaded = loadFromLocalStorage();
    if (loaded) {
      void start(loaded);
      hud.showToast('The world remembers.');
    } else {
      hud.showToast('The saved world could not be read.');
    }
  },
  onNewWorld: () => {
    const seed = (Math.random() * 0x7fffffff) | 0;
    void start(Simulation.create(seed));
    hud.showToast(`A new world kindles (seed ${seed}).`);
  },
  onToggleHistory: () => historyPanel.toggle(),
  onToggleDebug: () => debugOverlay.toggle(),
});

function setSpeed(index: number): void {
  speedIndex = index;
  if (index > 0) lastRunningSpeed = index;
  hud.setSpeed(index);
}

function togglePause(): void {
  setSpeed(speedIndex === 0 ? lastRunningSpeed : 0);
}

function weatherText(weather: Weather, season: number): string {
  const seasonIcon = ['🌱', '☀', '🍂', '❄'][season];
  if (weather.kind === 'rain') return `${seasonIcon} rain`;
  if (weather.kind === 'snow') return `${seasonIcon} snow`;
  return `${seasonIcon} clear`;
}

function onPick(sx: number, sy: number): void {
  if (!renderer) return;
  const wpt = renderer.camera.screenToWorld(sx, sy);
  const agent = agents.findNear(wpt.x, wpt.y, 6);
  if (agent) {
    inspector.select({ kind: 'citizen', id: agent.id });
    return;
  }
  const ts = BALANCE.map.tileSize;
  const tx = Math.floor(wpt.x / ts);
  const ty = Math.floor(wpt.y / ts);
  const settlement = sim.state.settlements.find(
    (s) => Math.abs(s.x - tx) <= 1 && Math.abs(s.y - ty) <= 1,
  );
  if (settlement) {
    inspector.select({ kind: 'settlement', id: settlement.id });
    return;
  }
  const w = sim.state.world;
  if (tx >= 0 && ty >= 0 && tx < w.width && ty < w.height) {
    inspector.select({ kind: 'tile', x: tx, y: ty });
  } else {
    inspector.select(null);
  }
}

function loop(ticker: Ticker): void {
  if (!renderer) return;
  const dt = Math.min(ticker.deltaMS, 100) / 1000;
  const speed = BALANCE.time.speeds[speedIndex];

  sim.advance(dt * speed * BALANCE.time.daysPerSecondAt1x);
  const state = sim.state;
  const season = seasonOf(state.day);

  // The ambient day/night cycle keeps breathing slowly even when paused, but
  // never spins fast enough to strobe at high sim speeds.
  const cycleRate = speed === 0 ? 0.15 : Math.min(speed, 3);
  ambient = (ambient + (dt * cycleRate) / BALANCE.time.ambientDaySeconds) % 1;
  const darkness = Math.pow(Math.cos(ambient * Math.PI * 2) * 0.5 + 0.5, 1.3);
  const duskGlow = Math.max(0, 1 - Math.abs(darkness - 0.5) * 5);
  const weather = weatherForDay(state.seed, state.day, season);

  agentSyncTimer += dt;
  if (agentSyncTimer >= BALANCE.render.agentSyncInterval) {
    agentSyncTimer = 0;
    const view =
      renderer.camera.scale >= BALANCE.agents.minZoom ? renderer.camera.viewTileBounds() : null;
    agents.sync(state, view);
  }
  agents.update(dt * Math.min(speed, BALANCE.agents.maxSpeedFactor), state, darkness);

  renderer.frame({
    state,
    agents: agents.agents,
    season,
    darkness,
    duskGlow,
    weather,
    dt,
    time: performance.now() / 1000,
  });

  uiTimer += dt;
  if (uiTimer >= BALANCE.render.uiRefreshInterval) {
    uiTimer = 0;
    hud.setDate(dateString(state.day));
    hud.setWeather(weatherText(weather, season));
    civPanel.update(state);
    inspector.update(state, agents);
    chroniclePanel.update(state);
    historyPanel.update(state);
    if (debugOverlay.visible) {
      let population = 0;
      for (const s of state.settlements) population += s.population;
      debugOverlay.update({
        fps: renderer.fps,
        day: state.day,
        entities: renderer.entityCount(),
        agents: agents.agents.length,
        settlements: state.settlements.length,
        civsAlive: state.civs.filter((c) => c.alive).length,
        population: Math.round(population),
        tickMs: sim.lastTickMs,
        timings: sim.timings,
        terrainVersion: state.terrainVersion,
        territoryVersion: state.territoryVersion,
      });
    }
  }
}

/** Start (or restart) the game with a fresh simulation. */
async function start(newSim: Simulation): Promise<void> {
  const old = renderer;
  renderer = null;
  old?.destroy();

  sim = newSim;
  agents = new AgentSystem();
  chroniclePanel = new ChroniclePanel();
  historyPanel = new HistoryPanel();
  inspector.select(null);

  const created = await Renderer.create(document.getElementById('app')!, sim.state.world);
  const first = sim.state.settlements[0];
  if (first) created.camera.centerOn(first.x, first.y);
  created.camera.attach(created.app.canvas, onPick);
  created.app.ticker.add(loop);
  renderer = created;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    togglePause();
    e.preventDefault();
  } else if (e.key === '1') setSpeed(1);
  else if (e.key === '2') setSpeed(2);
  else if (e.key === '3') setSpeed(3);
  else if (e.key === 'h' || e.key === 'H') historyPanel.toggle();
  else if (e.key === 'F3') {
    debugOverlay.toggle();
    e.preventDefault();
  } else if (e.key === 'Escape') {
    inspector.select(null);
    if (historyPanel.visible) historyPanel.toggle();
  }
});

const params = new URLSearchParams(location.search);
const initialSeed = Number(params.get('seed')) || DEFAULT_SEED;
hud.setSpeed(speedIndex);
void start(Simulation.create(initialSeed));
