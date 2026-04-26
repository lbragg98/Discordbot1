import type { RandomSource } from "../domain/random.js";

export class FixedRandom implements RandomSource {
  private idx = 0;
  constructor(private readonly values: number[]) {}
  next(): number {
    const value = this.values[this.idx % this.values.length];
    this.idx += 1;
    return value;
  }
}
