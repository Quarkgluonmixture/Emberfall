import { describe, expect, it } from 'vitest';
import { bindSingletonClick } from '../src/ui/singletonEvent';

describe('bindSingletonClick', () => {
  it('replaces the previous click handler on the same long-lived target', () => {
    const target = new EventTarget();
    let firstCalls = 0;
    let secondCalls = 0;

    bindSingletonClick(target, () => {
      firstCalls += 1;
    });
    target.dispatchEvent(new Event('click'));

    bindSingletonClick(target, () => {
      secondCalls += 1;
    });
    target.dispatchEvent(new Event('click'));

    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(1);
  });

  it('keeps singleton handlers independent across different targets', () => {
    const firstTarget = new EventTarget();
    const secondTarget = new EventTarget();
    let firstCalls = 0;
    let secondCalls = 0;

    bindSingletonClick(firstTarget, () => {
      firstCalls += 1;
    });
    bindSingletonClick(secondTarget, () => {
      secondCalls += 1;
    });

    firstTarget.dispatchEvent(new Event('click'));
    secondTarget.dispatchEvent(new Event('click'));

    expect(firstCalls).toBe(1);
    expect(secondCalls).toBe(1);
  });
});
