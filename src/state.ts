import type { WheelDuoPhase } from './types';

export type WheelDuoRuntimeState = {
  initialized: boolean;
  phase: WheelDuoPhase;
  warmedElements: WeakSet<HTMLElement>;
  finalRotation: WeakMap<HTMLElement, number>;
};

export function createRuntimeState(): WheelDuoRuntimeState {
  return {
    initialized: false,
    phase: 'idle',
    warmedElements: new WeakSet<HTMLElement>(),
    finalRotation: new WeakMap<HTMLElement, number>(),
  };
}

export function resetRuntimeState(state: WheelDuoRuntimeState): void {
  state.phase = 'idle';
  state.warmedElements = new WeakSet<HTMLElement>();
  state.finalRotation = new WeakMap<HTMLElement, number>();
}
