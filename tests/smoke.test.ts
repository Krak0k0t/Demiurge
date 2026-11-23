import { describe, expect, it } from 'vitest';
import { createRng } from '../src/core/rng';
import {
  createInitialHelloState,
  stepTotemPosition,
  toggleOverload,
} from '../src/systems/etherChannel';
import tuning from '../src/data/helloTuning.json';

describe('helloArena pure logic', () => {
  it('test_totem_movement_and_overload_respects_arena_bounds', () => {
    const rngA = createRng(42);
    const rngB = createRng(42);
    expect(rngA.next()).toBe(rngB.next());

    let state = createInitialHelloState();
    expect(state.ether).toBe(tuning.baseEther);
    expect(state.hp).toBe(tuning.startHp);

    for (let i = 0; i < 120; i++) {
      state = stepTotemPosition(state, { ix: 1, iz: 1 }, 1 / 60);
    }

    const radius = Math.hypot(state.x, state.z);
    expect(radius).toBeLessThanOrEqual(tuning.arenaRadius + 1e-6);
    expect(state.moves).toBe(120);

    state = toggleOverload(state);
    expect(state.overloadActive).toBe(true);
    expect(state.ether).toBe(tuning.baseEther + tuning.overloadBonusEther);
    expect(state.hp).toBe(tuning.startHp - tuning.overloadHpCost);
    expect(state.completed).toBe(true);
  });
});
