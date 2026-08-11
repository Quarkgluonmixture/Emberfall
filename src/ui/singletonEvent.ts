/**
 * Bind exactly one click handler to a long-lived UI root.
 *
 * Emberfall recreates some panel controllers when a world is restarted, while
 * the DOM roots themselves stay mounted. A plain addEventListener in each
 * constructor therefore leaks one additional live handler per restart.
 *
 * Keeping the previous handler in a WeakMap lets a new controller replace it
 * without retaining either the element or stale controller forever.
 */
const clickHandlers = new WeakMap<EventTarget, EventListener>();

export function bindSingletonClick(target: EventTarget, handler: EventListener): void {
  const previous = clickHandlers.get(target);
  if (previous) target.removeEventListener('click', previous);

  target.addEventListener('click', handler);
  clickHandlers.set(target, handler);
}
