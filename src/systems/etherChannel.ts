import tuning from '../data/helloTuning.json';

export interface HelloState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  overloadActive: boolean;
  ether: number;
  hp: number;
  moves: number;
  completed: boolean;
}

export interface MoveInput {
  ix: number;
  iz: number;
}

export function createInitialHelloState(): HelloState {
  return {
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    overloadActive: false,
    ether: tuning.baseEther,
    hp: tuning.startHp,
    moves: 0,
    completed: false,
  };
}

export function stepTotemPosition(
  state: HelloState,
  input: MoveInput,
  dt: number
): HelloState {
  const len = Math.hypot(input.ix, input.iz);
  const nx = len > 0 ? input.ix / len : 0;
  const nz = len > 0 ? input.iz / len : 0;
  const targetVx = nx * tuning.moveSpeed;
  const targetVz = nz * tuning.moveSpeed;

  const nextX = state.x + targetVx * dt;
  const nextZ = state.z + targetVz * dt;
  const dist = Math.hypot(nextX, nextZ);
  const clampedRatio = dist > tuning.arenaRadius ? tuning.arenaRadius / dist : 1;

  const moved = Math.abs(nx) > 0 || Math.abs(nz) > 0;
  const moves = moved ? state.moves + 1 : state.moves;

  return {
    ...state,
    x: nextX * clampedRatio,
    z: nextZ * clampedRatio,
    vx: targetVx,
    vz: targetVz,
    moves,
    completed: state.completed || (moves >= 10 && state.overloadActive),
  };
}

export function toggleOverload(state: HelloState): HelloState {
  const nextActive = !state.overloadActive;
  const ether = nextActive
    ? tuning.baseEther + tuning.overloadBonusEther
    : tuning.baseEther;
  const hp = nextActive
    ? Math.max(1, state.hp - tuning.overloadHpCost)
    : state.hp;

  return {
    ...state,
    overloadActive: nextActive,
    ether,
    hp,
    completed: state.completed || (state.moves >= 10 && nextActive),
  };
}
