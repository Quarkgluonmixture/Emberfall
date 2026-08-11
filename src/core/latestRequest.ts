/**
 * Tiny generation gate for async operations where only the newest request may
 * publish its result. Older work is still allowed to finish so it can clean up
 * its own resources, but it cannot take ownership afterward.
 */
export class LatestRequestGate {
  private generation = 0;

  begin(): number {
    this.generation++;
    return this.generation;
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }
}
