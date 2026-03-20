import { WARM_UP_DURATION_MS } from './constants';
import { type NormalizedWheelDuoOptions, normalizeWheelDuoOptions } from './normalize';
import { createRuntimeState, resetRuntimeState, type WheelDuoRuntimeState } from './state';
import type { WheelDuoOptions } from './types';

type WheelDuoDomRefs = {
  root: HTMLElement;
  firstWheel: HTMLElement;
  secondWheel: HTMLElement;
  trigger: HTMLElement;
};

export class WheelDuo {
  private domRefs: WheelDuoDomRefs | null = null;
  private swayAnimation: Animation | null = null;
  private swayingElement: HTMLElement | null = null;
  private readonly runtime: WheelDuoRuntimeState = createRuntimeState();
  private readonly config: NormalizedWheelDuoOptions;

  private readonly onFirstClick = (): void => {
    void this.runPhaseOne();
  };

  private readonly onSecondClick = (): void => {
    void this.runPhaseTwo();
  };

  public constructor(options: Readonly<WheelDuoOptions>) {
    this.config = normalizeWheelDuoOptions(options);
  }

  public init(): void {
    if (this.runtime.initialized) return;

    const root = this.getRequiredElement(document, this.config.rootSelector, 'rootSelector');
    const firstWheel = this.getRequiredElement(
      root,
      this.config.firstWheelSelector,
      'firstWheelSelector',
    );
    const secondWheel = this.getRequiredElement(
      root,
      this.config.secondWheelSelector,
      'secondWheelSelector',
    );
    const trigger = this.getRequiredElement(root, this.config.triggerSelector, 'triggerSelector');

    this.domRefs = { root, firstWheel, secondWheel, trigger };
    this.runtime.initialized = true;
    this.runtime.phase = 'idle';

    this.warmUp(firstWheel);
    this.warmUp(secondWheel);
    this.startSway(firstWheel);

    trigger.addEventListener('click', this.onFirstClick);
  }

  public destroy(): void {
    if (!this.runtime.initialized || !this.domRefs) return;

    this.stopSway();
    this.cancelAnimations(this.domRefs.firstWheel);
    this.cancelAnimations(this.domRefs.secondWheel);
    this.domRefs.trigger.removeEventListener('click', this.onFirstClick);
    this.domRefs.trigger.removeEventListener('click', this.onSecondClick);
    this.runtime.initialized = false;
    this.runtime.phase = 'idle';
  }

  public reset(): void {
    const refs = this.getDomRefs();

    this.destroy();

    refs.firstWheel.style.transform = '';
    refs.secondWheel.style.transform = '';

    refs.root.classList.remove(
      `${this.config.rootClassName}--state-one-active`,
      `${this.config.rootClassName}--state-one-complete`,
      `${this.config.rootClassName}--state-two-active`,
      `${this.config.rootClassName}--state-two-complete`,
    );

    resetRuntimeState(this.runtime);
    this.init();
  }

  private warmUp(element: HTMLElement): void {
    if (this.runtime.warmedElements.has(element)) return;

    const warm = element.animate(
      [{ filter: 'blur(0)' }, { filter: 'blur(0.4px)', offset: 0.5 }, { filter: 'blur(0)' }],
      { duration: WARM_UP_DURATION_MS, fill: 'forwards' },
    );

    element.getBoundingClientRect();

    warm.onfinish = (): void => {
      warm.commitStyles?.();
      warm.cancel();
    };

    element.querySelectorAll('img').forEach((img) => {
      img.decode?.().catch(() => {});
    });

    this.runtime.warmedElements.add(element);
  }

  private async runPhaseOne(): Promise<void> {
    if (this.runtime.phase !== 'idle') return;

    const refs = this.getDomRefs();
    const [firstTargetAngle] = this.config.targetAngles;

    this.runtime.phase = 'spinningFirst';
    refs.root.classList.add(`${this.config.rootClassName}--state-one-active`);
    this.stopSway();

    await this.rotateWheelTo(refs.firstWheel, firstTargetAngle);

    refs.root.classList.replace(
      `${this.config.rootClassName}--state-one-active`,
      `${this.config.rootClassName}--state-one-complete`,
    );
    this.startSway(refs.secondWheel);

    refs.trigger.removeEventListener('click', this.onFirstClick);
    refs.trigger.addEventListener('click', this.onSecondClick, { once: true });
    this.runtime.phase = 'spinningSecond';
  }

  private async runPhaseTwo(): Promise<void> {
    if (this.runtime.phase !== 'spinningSecond') return;

    const refs = this.getDomRefs();
    const [, secondTargetAngle] = this.config.targetAngles;

    refs.root.classList.add(`${this.config.rootClassName}--state-two-active`);
    this.stopSway();

    await this.rotateWheelTo(refs.secondWheel, secondTargetAngle);

    refs.root.classList.replace(
      `${this.config.rootClassName}--state-two-active`,
      `${this.config.rootClassName}--state-two-complete`,
    );
    this.runtime.phase = 'complete';
    this.config.callback?.();
  }

  private async rotateWheelTo(element: HTMLElement, finalDeg: number): Promise<void> {
    const current = this.getCurrentRotation(element);
    const diffCW = (this.normalize(finalDeg) - this.normalize(current) + 360) % 360;
    const target = current + this.config.rotations * 360 + diffCW;
    const overs = target + this.config.overshootDeg;
    const total = this.config.duration + this.config.returnDuration;
    const overshootAt = this.config.duration / total;

    const spin = element.animate(
      [
        { transform: `rotate(${current}deg)`, easing: 'cubic-bezier(0.86,0,0.07,1)' },
        {
          offset: overshootAt,
          transform: `rotate(${overs}deg)`,
          easing: 'cubic-bezier(0.77,0,0.175,1)',
        },
        { transform: `rotate(${target}deg)` },
      ],
      { duration: total, fill: 'forwards' },
    );

    const blur = element.animate(
      [
        { filter: 'blur(0)' },
        { offset: 0.2, filter: 'blur(1px)' },
        { offset: 0.4, filter: 'blur(2px)' },
        { offset: 0.65, filter: 'blur(1px)' },
        { offset: 1, filter: 'blur(0)' },
      ],
      { duration: total, fill: 'forwards', easing: 'ease-in-out' },
    );

    await Promise.all([spin.finished, blur.finished]);
    this.runtime.finalRotation.set(element, this.normalize(target));
  }

  private startSway(element: HTMLElement): void {
    this.stopSway();
    this.swayingElement = element;

    const base = this.runtime.finalRotation.get(element) ?? this.getCurrentRotation(element);

    this.swayAnimation = element.animate(
      [
        { transform: `rotate(${base - this.config.swayAmplitude}deg)` },
        { transform: `rotate(${base + this.config.swayAmplitude}deg)` },
      ],
      {
        duration: this.config.swayPeriod,
        direction: 'alternate',
        iterations: Infinity,
        easing: 'ease-in-out',
        delay: -this.config.swayPeriod / 2,
      },
    );
  }

  private stopSway(): void {
    if (!this.swayAnimation || !this.swayingElement) return;

    const snap = getComputedStyle(this.swayingElement).transform;

    this.swayAnimation.commitStyles?.();
    this.swayAnimation.cancel();
    this.swayingElement.style.transform = snap !== 'none' ? snap : '';

    this.swayAnimation = null;
    this.swayingElement = null;
  }

  private normalize(deg: number): number {
    return ((deg % 360) + 360) % 360;
  }

  private getCurrentRotation(element: HTMLElement): number {
    const transform = getComputedStyle(element).transform;
    if (!transform || transform === 'none') return 0;
    const { a, b } = new DOMMatrixReadOnly(transform);
    return (Math.atan2(b, a) * 180) / Math.PI;
  }

  private cancelAnimations(element: HTMLElement): void {
    element.getAnimations().forEach((animation) => {
      animation.cancel();
    });
  }

  private getDomRefs(): WheelDuoDomRefs {
    if (!this.domRefs) {
      throw new Error('WheelDuo is not initialized. Call init() before using this method.');
    }
    return this.domRefs;
  }

  private getRequiredElement(
    root: ParentNode,
    selector: string,
    optionName: keyof Pick<
      WheelDuoOptions,
      'rootSelector' | 'firstWheelSelector' | 'secondWheelSelector' | 'triggerSelector'
    >,
  ): HTMLElement {
    const element = root.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`WheelDuo init failed: element for "${optionName}" not found (${selector})`);
    }
    return element;
  }
}
