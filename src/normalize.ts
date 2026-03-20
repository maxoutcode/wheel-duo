import {
  DEFAULT_DURATION_MS,
  DEFAULT_OVERSHOOT_DEG,
  DEFAULT_RETURN_DURATION_MS,
  DEFAULT_ROTATIONS,
  DEFAULT_SWAY_AMPLITUDE_DEG,
  DEFAULT_SWAY_PERIOD_MS,
} from './constants';
import type { WheelDuoOptions } from './types';

export type NormalizedWheelDuoOptions = {
  rootSelector: string;
  firstWheelSelector: string;
  secondWheelSelector: string;
  triggerSelector: string;
  targetAngles: [number, number];
  rotations: number;
  duration: number;
  overshootDeg: number;
  returnDuration: number;
  swayAmplitude: number;
  swayPeriod: number;
  callback?: () => void;
  rootClassName: string;
};

function requireSelector(name: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} must be a non-empty CSS selector`);
  }
  return trimmed;
}

function requireFinite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
  return value;
}

function requirePositive(name: string, value: number): number {
  const finite = requireFinite(name, value);
  if (finite <= 0) {
    throw new Error(`${name} must be greater than 0`);
  }
  return finite;
}

export function normalizeWheelDuoOptions(
  input: Readonly<WheelDuoOptions>,
): NormalizedWheelDuoOptions {
  const rootSelector = requireSelector('rootSelector', input.rootSelector);
  const firstWheelSelector = requireSelector('firstWheelSelector', input.firstWheelSelector);
  const secondWheelSelector = requireSelector('secondWheelSelector', input.secondWheelSelector);
  const triggerSelector = requireSelector('triggerSelector', input.triggerSelector);

  const targetAngles: [number, number] = [
    requireFinite('targetAngles[0]', input.targetAngles[0]),
    requireFinite('targetAngles[1]', input.targetAngles[1]),
  ];

  const rotations = requirePositive('rotations', input.rotations ?? DEFAULT_ROTATIONS);
  const duration = requirePositive('duration', input.duration ?? DEFAULT_DURATION_MS);
  const overshootDeg = requireFinite('overshootDeg', input.overshootDeg ?? DEFAULT_OVERSHOOT_DEG);
  const returnDuration = requirePositive(
    'returnDuration',
    input.returnDuration ?? DEFAULT_RETURN_DURATION_MS,
  );
  const swayAmplitude = requireFinite(
    'swayOptions.amplitude',
    input.swayOptions?.amplitude ?? DEFAULT_SWAY_AMPLITUDE_DEG,
  );
  const swayPeriod = requirePositive(
    'swayOptions.period',
    input.swayOptions?.period ?? DEFAULT_SWAY_PERIOD_MS,
  );

  const rootClassName = rootSelector.startsWith('.') ? rootSelector.slice(1) : rootSelector;

  return {
    rootSelector,
    firstWheelSelector,
    secondWheelSelector,
    triggerSelector,
    targetAngles,
    rotations,
    duration,
    overshootDeg,
    returnDuration,
    swayAmplitude,
    swayPeriod,
    callback: input.callback,
    rootClassName,
  };
}
