import type { Types } from './types';

/**
 * A reusable countdown that can be stopped, resumed, reset, or destroyed.
 *
 * Await {@link Countdown.waiting} for completion. Destroying the delay also releases
 * waiting callers; check `finished` and `destroyed` to distinguish the outcomes.
 * All durations are in milliseconds and subject to event-loop scheduling.
 *
 * @example
 * ```ts
 * import { Countdown } from 'promise-cycle';
 *
 * const counter = new Countdown(1000, true);
 * await Countdown.sleep(100);
 * counter.stop();
 * await Countdown.sleep(200);
 * await counter.resume();
 * console.log(counter.finished, counter.history);
 * ```
 */
export class Countdown {
	/**
	 * Waits once without creating a reusable countdown.
	 *
	 * @param delay - Milliseconds to wait. Omitted or nonpositive values resolve immediately.
	 * @returns A promise that fulfills when the wait ends.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 * await Countdown.sleep(250);
	 * ```
	 */
	static sleep(delay?: number): Promise<void> {
		delay = Countdown.normalize(delay);
		if (!Countdown.isValid(delay)) return Promise.resolve();
		return new Promise((resolve) => setTimeout(resolve, delay));
	}

	/**
	 * Converts a duration to a supported timer value.
	 * Positive numbers are rounded, with a minimum of 1 and maximum of 2,147,483,647.
	 * Nonnumeric values, `NaN`, and nonpositive numbers become zero, or one when requested.
	 *
	 * @param value - Duration to normalize and clamp.
	 * @param fallbackIsDigitOne - Use 1 instead of 0 for invalid input.
	 * @returns The normalized duration in milliseconds.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * Countdown.normalize(2.7); // 3
	 * Countdown.normalize(-1); // 0
	 * Countdown.normalize(undefined); // 0
	 * Countdown.normalize(undefined, true); // 1
	 * ```
	 */
	static normalize(value?: any, fallbackIsDigitOne = false): number {
		if (typeof value !== 'number' || isNaN(value) || value <= 0) {
			return fallbackIsDigitOne ? 1 : 0;
		}
		value = Math.round(value);
		return value < 1 ? 1 : value >= 2_147_483_647 ? 2_147_483_647 : value;
	}

	/**
	 * Tests whether a value is a number is at least 1 and at most 2,147,483,647.
	 * Fractions are accepted. This check does not round or convert the value.
	 *
	 * @param delay - Value to test.
	 * @returns Whether the value is a supported positive duration.
	 */
	static isValid(delay?: any): delay is number {
		return typeof delay === 'number' && !isNaN(delay) && delay >= 1 && delay <= 2_147_483_647;
	}

	private state = {
		stopped: false,
		finished: false,
		destroyed: false,
		startedAt: 0,
		scheduled: 0,
		remaining: 0,
		history: null as any as Types.HistoryEntry[],
		historySupported: false,
		promise: null as any as Promise<void>,
		timer: undefined as undefined | ReturnType<typeof setTimeout>,
		params: {} as { delay?: number },
		complete: undefined as undefined | (() => void),
	};

	/**
	 * Starts a countdown immediately.
	 *
	 * @param delay - Duration in milliseconds. Omitted or nonpositive values finish immediately.
	 * @param historySupported - Enable lifecycle history for this instance. Defaults to false.
	 */
	constructor(delay?: number, historySupported = false) {
		this.state.historySupported = !!historySupported;
		if (this.state.historySupported) this.state.history = [];
		this.reset(delay);
	}

	/**
	 * The current wait, fulfilled on completion or destruction.
	 * Stop, reset and resume preserve this promise.
	 *
	 * Reset and resume preserves a pending promise, but creates
	 * a new one if the previous wait has already completed.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * const counter = new Countdown(1000);
	 * await counter.waiting;
	 * ```
	 */
	get waiting(): Promise<void> {
		return this.state.promise;
	}

	/**
	 * The actual remaining duration in milliseconds at the time of reading.
	 *
	 * @remarks
	 * Always zero if finished or destroyed.
	 */
	get remaining(): number {
		if (this.state.destroyed || this.state.finished) return 0;
		return this.running ? this.calculateRemaining(performance.now()) : this.state.remaining;
	}

	/** Whether a timer is currently scheduled. False while stopped or after completion or destruction. */
	get running(): boolean {
		return this.state.timer !== undefined;
	}

	/** Whether the countdown is paused with time remaining and can be resumed. */
	get stopped(): boolean {
		return this.state.stopped;
	}

	/**
	 * Whether the current countdown completed. Reset clears this flag.
	 * Destroying an unfinished countdown does not mark it finished.
	 */
	get finished(): boolean {
		return this.state.finished;
	}

	/** Whether this instance has been permanently disabled by `destroy()`. */
	get destroyed(): boolean {
		return this.state.destroyed;
	}

	/** Whether lifecycle history was enabled in the constructor. */
	get historySupported(): boolean {
		return this.state.historySupported;
	}

	/**
	 * A chronological snapshot of recorded lifecycle events, or an empty array if disabled.
	 * Timestamps use `performance.now()`.
	 *
	 * Editing a returned snapshot cannot affect the countdown or future snapshots.
	 *
	 * Destroying the countdown also clears history.
	 */
	get history(): Types.History {
		if (!this.state.historySupported) return [];
		return this.state.history.map((entry) => ({ ...entry }));
	}

	/** Returns {@link Countdown.running}: whether a timer is currently scheduled. */
	isRunning(): boolean {
		return this.running;
	}

	/** Returns {@link Countdown.stopped}: whether the countdown is paused. */
	isStopped(): boolean {
		return this.stopped;
	}

	/** Returns {@link Countdown.finished}: whether the current countdown completed. */
	isFinished(): boolean {
		return this.finished;
	}

	/** Returns {@link Countdown.destroyed}: whether the instance is permanently disabled. */
	isDestroyed(): boolean {
		return this.destroyed;
	}

	/** Returns {@link Countdown.historySupported}: whether lifecycle history is enabled for this instance. */
	isHistorySupported(): boolean {
		return this.historySupported;
	}

	/** Returns the same kind of independent history snapshot as {@link Countdown.history}. */
	getHistory(): Types.History {
		return this.history;
	}

	/**
	 * Removes recorded events without affecting the countdown or existing snapshots.
	 * Does nothing when history is disabled.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * const counter = new Countdown(100, true);
	 * counter.stop();
	 * counter.resume();
	 *
	 * counter.clearHistory();
	 * await counter.waiting;
	 * console.log(counter.history); // Contains the subsequent finished event only.
	 * ```
	 */
	clearHistory(): void {
		if (!this.historySupported) return;
		this.state.history = [];
	}

	/**
	 * Replaces the current countdown with a full duration and records a `started` event.
	 * Restarts a stopped or finished countdown. Does nothing after destruction.
	 *
	 * @param delay - New duration, or the last constructor/reset duration when omitted.
	 * @returns The existing pending promise, or a new promise if the previous wait completed.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * const counter = new Countdown(1000);
	 * await counter.reset(200); // Replace the original wait with 200 ms.
	 * await counter.reset(); // Start another 200 ms wait.
	 * ```
	 */
	reset(delay = this.state.params.delay): Promise<void> {
		if (this.state.destroyed) return this.state.promise;

		const currentDelay = Countdown.normalize(delay);
		this.state.params = { delay: currentDelay };

		this.clearTimeout();
		return this.begin(currentDelay, 'started');
	}

	/**
	 * Continues a stopped countdown using its remaining duration.
	 * Does nothing when running, finished, or destroyed.
	 *
	 * @returns The current waiting promise.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * const counter = new Countdown(500);
	 * await Countdown.sleep(100);
	 *
	 * counter.stop();
	 * console.log(counter.remaining); // Approximately 400 ms
	 *
	 * await counter.resume(); // Continues with the remaining 400 ms
	 * ```
	 */
	resume(): Promise<void> {
		if (this.state.destroyed || !this.state.stopped) return this.state.promise;

		return this.begin(this.state.remaining, 'resumed');
	}

	private begin(delay: number, event: 'started' | 'resumed') {
		const now = (this.state.startedAt = performance.now());
		this.state.stopped = false;
		this.state.finished = false;
		this.state.scheduled = delay;
		this.record(event, now);

		if (!this.state.complete) {
			this.state.promise = new Promise((resolve) => (this.state.complete = resolve));
		}

		this.state.remaining = this.state.scheduled;
		if (!Countdown.isValid(this.state.remaining)) this.finish(now);
		else {
			this.state.timer = setTimeout(() => this.finish(), this.state.remaining);
		}

		return this.state.promise;
	}

	/**
	 * Pauses an active countdown, preserving its remaining time and pending promise.
	 * If its duration has already elapsed, completes the wait instead.
	 * Does nothing when stopped, finished, or destroyed. Use `resume()` to continue.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * const counter = new Countdown(1000);
	 * await Countdown.sleep(100);
	 *
	 * counter.stop();
	 * console.log(counter.remaining); // Approximately 900 ms
	 * ```
	 */
	stop(): void {
		if (this.state.destroyed || this.state.stopped || this.state.timer === undefined) return;
		const now = performance.now();
		const remaining = this.calculateRemaining(now);

		if (Countdown.isValid(remaining)) {
			this.state.remaining = Countdown.normalize(remaining);
			this.state.stopped = true;
			this.clearTimeout();
			this.record('stopped', now);
		} else {
			this.finish(now);
		}
	}

	/**
	 * Permanently cancels this countdown and fulfills its waiting promise.
	 * Future reset, stop, and resume calls have no effect. An unfinished countdown
	 * remains `finished === false`, so callers can distinguish cancellation from completion.
	 *
	 * @example
	 * ```ts
	 * import { Countdown } from 'promise-cycle';
	 *
	 * const counter = new Countdown(1000);
	 * counter.destroy();
	 * await counter.waiting; // Released without waiting for the timeout.
	 * console.log(counter.destroyed); // true
	 * ```
	 */
	destroy(): void {
		if (this.state.destroyed) return;
		const now = performance.now();
		if (this.running) {
			this.state.remaining = this.calculateRemaining(now);
		}
		this.clearTimeout();
		this.completePromise();
		this.clearHistory();
		this.record('destroyed', now);
		this.state.destroyed = true;
		this.state.stopped = false;
	}

	private finish(at = performance.now()): void {
		this.state.stopped = false;
		this.state.finished = true;
		this.state.remaining = 0;

		this.clearTimeout();
		const cleared = this.completePromise();
		if (cleared) this.record('finished', at);
	}

	private record(event: Types.HistoryEntry['event'], at = performance.now()): void {
		if (!this.state.historySupported) return;
		if (event === 'started' || event === 'resumed') {
			this.state.history.push({ event, at, delay: this.state.scheduled });
		} else {
			this.state.history.push({ event, at, delay: this.state.scheduled, remaining: this.state.remaining });
		}
	}

	private calculateRemaining(at: number): number {
		return Math.max(0, this.state.scheduled - (at - this.state.startedAt));
	}

	private clearTimeout(): boolean {
		const timer = this.state.timer;
		this.state.timer = undefined;
		clearTimeout(timer);
		return !!timer;
	}

	private completePromise(): boolean {
		const complete = this.state.complete;
		this.state.complete = undefined;
		complete?.();
		return !!complete;
	}
}
