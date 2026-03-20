export type WheelDuoPhase = 'idle' | 'spinningFirst' | 'spinningSecond' | 'complete';

export interface WheelDuoOptions {
  rootSelector: string;
  firstWheelSelector: string;
  secondWheelSelector: string;
  triggerSelector: string;
  targetAngles: readonly [number, number];
  rotations?: number;
  duration?: number;
  overshootDeg?: number;
  returnDuration?: number;
  swayOptions?: {
    amplitude?: number;
    period?: number;
  };
  callback?: () => void;
}
