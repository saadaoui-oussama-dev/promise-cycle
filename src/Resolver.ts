import { Countdown } from './Countdown';
import type { CallProcess, ResolverArguments, ResolverOutcome, ResolverReturn, Types } from './types';

/**
 * Shares one asynchronous outcome across independently timed waiting calls.
 *
 * The first source or manual settlement wins. Each waiting call can transform
 * its result or use a fallback without changing the shared outcome.
 *
 * @typeParam Value - Source value type; defaults to `any` for an empty constructor.
 * @typeParam Reason - Rejection type exposed to error callbacks; defaults to `unknown`.
 *
 * @example
 * ```ts
 * import { Resolver } from 'promise-cycle';
 *
 * const resolver = new Resolver<string, Error>();
 * resolver.resolve('ready');
 * console.log(await resolver.waiting); // 'ready'
 * ```
 */
export class Resolver<Value = any, Reason = unknown> {
	/** Creates a resolver whose source fulfills with `undefined`. */
	static resolve(): Resolver<undefined>;
	/**
	 * Creates a resolver that adopts a value, promise, or thenable.
	 * Function values are preserved, not invoked. A rejected input produces a rejected resolver.
	 *
	 * @typeParam Value - Inferred input type; nested promise values are unwrapped.
	 * @param value - Value or asynchronous result to adopt.
	 * @returns A resolver; use a waiting method or `waiting` to obtain a promise.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const resolver = Resolver.resolve(42);
	 * console.log(await resolver.waiting); // 42
	 * ```
	 */
	static resolve<Value>(value: Value | PromiseLike<Value>): Resolver<Awaited<Value>>;
	static resolve<Value>(value?: Value | PromiseLike<Value>): Resolver<Awaited<Value> | undefined> {
		return new Resolver<Awaited<Value> | undefined>(Promise.resolve(value));
	}

	/** Creates a resolver whose source rejects with `undefined`. */
	static reject(): Resolver<never, undefined>;
	/**
	 * Creates a resolver that rejects with the supplied reason.
	 *
	 * @typeParam Reason - Inferred rejection type, retained by error callbacks.
	 * @param reason - Rejection reason, preserved as supplied without promise unwrapping.
	 * @returns A resolver with no fulfillment value and a typed rejection reason.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const message = await Resolver.reject(new Error('Unavailable')).immediate({
	 *   throw: false,
	 *   error: (reason) => reason.message,
	 * });
	 * ```
	 */
	static reject<Reason>(reason: Reason): Resolver<never, Reason>;
	static reject<Reason>(reason?: Reason): Resolver<never, Reason | undefined> {
		return new Resolver<never, Reason | undefined>(Promise.reject(reason));
	}

	/**
	 * Creates a resolver and waits for its outcome without an added timing delay.
	 * Accepts the same callback and fallback options as the instance method.
	 *
	 * ```text
	 * immediate()
	 *
	 * 0 ms                    300 ms
	 * |-----------------------|---->
	 * ^ call begins           ^ source settles
	 *                         ^ result delivered
	 * ```
	 *
	 * @typeParam Value - Source value type inferred from the input.
	 * @typeParam Reason - Rejection type exposed to the error callback.
	 * @typeParam Res - Success callback result type.
	 * @typeParam Rej - Error callback result type when `throw` is false.
	 * @typeParam Throw - Whether source/manual rejections are rethrown; defaults to true.
	 *
	 * @param promise - A promise or plain value to observe. Function values are not invoked.
	 * @param options - Per-call callbacks, rejection policy, and fallback settings.
	 * @returns A promise for the selected value or callback result.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const response = await Resolver.immediate(fetch('/api/data'), {
	 *   throw: false,
	 *   fallbackAfter: 7000,
	 *   fallback: () => ({ error: 'offline' }),
	 *   error: (reason) => console.error(reason.message),
	 *   success: (value) => value.json(),
	 * });
	 * ```
	 */
	static async immediate<Value, Reason = unknown, Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>(
		promise: Promise<Value> | Awaited<Value>,
		...options: ResolverArguments<NoInfer<Value>, Reason, Res, Rej, Throw>
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		return new Resolver<Value, Reason>(promise).immediate<Res, Rej, Throw>(...options);
	}

	/**
	 * Creates a resolver and holds its outcome until a minimum duration has passed.
	 * A fallback may finish the call earlier while the source remains pending.
	 *
	 * ```text
	 * minimum(1000) - source settles early
	 *
	 * 0 ms          200 ms                     1000 ms
	 * |-------------|-------------------------|---->
	 * ^ call begins ^ source settles
	 *                                         ^ minimum ends
	 *                                         ^ result delivered
	 *
	 * minimum(1000) - source settles late
	 *
	 * 0 ms                    1000 ms          1500 ms
	 * |-----------------------|---------------|---->
	 * ^ call begins                           ^ source settles
	 *                         ^ minimum ends
	 *                                         ^ result delivered
	 * ```
	 *
	 * @typeParam Value - Source value type inferred from the input.
	 * @typeParam Reason - Rejection type exposed to the error callback.
	 * @typeParam Res - Success callback result type.
	 * @typeParam Rej - Error callback result type when `throw` is false.
	 * @typeParam Throw - Whether source/manual rejections are rethrown; defaults to true.
	 *
	 * @param promise - A promise or plain value to observe. Function values are not invoked.
	 * @param minDelay - Minimum wait in milliseconds, measured from the waiting call.
	 * @param options - Per-call callbacks, rejection policy, and fallback settings.
	 * @returns A promise for the selected value or callback result.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const response = await Resolver.minimum(fetch('/api/data'), 1000);
	 * ```
	 */
	static async minimum<Value, Reason = unknown, Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>(
		promise: Promise<Value> | Awaited<Value>,
		minDelay: number,
		...options: ResolverArguments<NoInfer<Value>, Reason, Res, Rej, Throw>
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		return new Resolver<Value, Reason>(promise).minimum<Res, Rej, Throw>(minDelay, ...options);
	}

	/**
	 * Creates a resolver and checks for settlement on a repeating timing schedule.
	 * Interval checks observe the same promise; they do not repeat the operation.
	 *
	 * ```text
	 * interval(500, 1000)
	 *
	 * 0 ms          500 ms         1500 ms   1800 ms   2500 ms
	 * |-------------|---------------|---------|-------|-------->
	 * ^ call begins                           ^ source settles
	 * <-- 500 ms --><--- 1000 ms ---><--- 1000 ms ---><--- 1000 ms --->
	 *               ^ first check   ^ second check    ^ third check
	 *                                                 ^ result delivered
	 * ```
	 *
	 * @typeParam Value - Source value type inferred from the input.
	 * @typeParam Reason - Rejection type exposed to the error callback.
	 * @typeParam Res - Success callback result type.
	 * @typeParam Rej - Error callback result type when `throw` is false.
	 * @typeParam Throw - Whether source/manual rejections are rethrown; defaults to true.
	 *
	 * @param promise - A promise or plain value to observe. Function values are not invoked.
	 * @param minDelay - Milliseconds before the first check.
	 * @param interval - Milliseconds between subsequent checks while pending.
	 * @param options - Per-call callbacks, rejection policy, and fallback settings.
	 * @returns A promise for the selected value or callback result.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const response = await Resolver.interval(fetch('/api/data'), 500, 1000);
	 * ```
	 */
	static async interval<Value, Reason = unknown, Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>(
		promise: Promise<Value> | Awaited<Value>,
		minDelay: number,
		interval: number,
		...options: ResolverArguments<NoInfer<Value>, Reason, Res, Rej, Throw>
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		return new Resolver<Value, Reason>(promise).interval<Res, Rej, Throw>(minDelay, interval, ...options);
	}

	private state = {
		status: 'pending' as Types.Status,
		source: 'pending' as Types.Source | 'pending',
		promise: null as any as Promise<ResolverOutcome<Value, Reason>>,
		complete: (() => {}) as (outcome: ResolverOutcome<Value, Reason>) => void,
	};

	/**
	 * Creates a resolver that observes a promise or plain value.
	 * Omit the argument to wait for manual `resolve()` or `reject()`.
	 * Function inputs are preserved as values, not invoked as factories.
	 *
	 * @param promise - Optional source promise.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const manual = new Resolver<number, Error>();
	 * manual.resolve(42);
	 *
	 * const request = new Resolver(fetch('/api/data'));
	 * await request.minimum(1500);
	 * ```
	 */
	constructor(...args: [] | [promise: Promise<Value> | Awaited<Value>]) {
		this.state.promise = new Promise((complete) => (this.state.complete = complete));
		if (args.length === 0) return;
		const [promise] = args;
		Promise.resolve(promise).then(
			(value) => this.settle({ status: 'fulfilled', value, source: 'normal' }),
			(reason) => this.settle({ status: 'rejected', reason, source: 'normal' }),
		);
	}

	/** Shared settlement status. Per-call fallbacks and callback failures do not change it. */
	get status(): Types.Status {
		return this.state.status;
	}

	/** Origin of the shared outcome, or `pending` before settlement. Per-call fallbacks do not change it. */
	get source(): Types.Source | 'pending' {
		return this.state.source;
	}

	/**
	 * The shared source/manual result with no timing delay, callbacks, or fallback.
	 * Rejects with the shared reason when the resolver is rejected.
	 */
	get waiting(): Promise<Awaited<Value>> {
		return this.state.promise.then((outcome) => {
			if (outcome.status === 'rejected') throw outcome.reason;
			return outcome.value;
		});
	}

	/** Whether neither the source nor a manual call has settled the resolver. */
	isPending(): boolean {
		return this.state.status === 'pending';
	}

	/** Whether the shared outcome is a fulfilled value. */
	isFulfilled(): boolean {
		return this.state.status === 'fulfilled';
	}

	/** Whether the shared outcome is a rejection. */
	isRejected(): boolean {
		return this.state.status === 'rejected';
	}

	/**
	 * Fulfills a pending resolver manually, with source `manual`.
	 * Later settlements are ignored. The original operation is not canceled.
	 *
	 * @param value - Value to provide to all current and future waiting calls.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const resolver = new Resolver<string>();
	 * resolver.resolve('ready');
	 * console.log(await resolver.waiting); // 'ready'
	 * ```
	 */
	resolve(value: Awaited<Value>): void {
		this.settle({ status: 'fulfilled', value, source: 'manual' });
	}

	/**
	 * Rejects a pending resolver manually, with source `manual`.
	 * Later settlements are ignored. Waiting calls apply their own error callback and `throw` option.
	 *
	 * @param reason - Rejection reason matching the resolver's `Reason` type.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const resolver = new Resolver<string, Error>();
	 * resolver.reject(new Error('Canceled'));
	 *
	 * await resolver.immediate({
	 *   throw: false,
	 *   error: (reason) => console.log(reason.message), // Canceled
	 * });
	 * ```
	 */
	reject(reason: Reason): void {
		this.settle({ status: 'rejected', reason, source: 'manual' });
	}

	private settle(outcome: ResolverOutcome<Value, Reason> & { source: Types.Source }): void {
		if (this.state.status !== 'pending') return;
		this.state.status = outcome.status;
		this.state.source = outcome.source;
		this.state.complete(outcome);
	}

	/**
	 * Delivers the shared outcome as soon as it settles, without an added timing delay.
	 * A configured fallback can supply this call's result while the resolver is pending.
	 *
	 * ```text
	 * immediate()
	 *
	 * 0 ms                    300 ms
	 * |-----------------------|---->
	 * ^ call begins           ^ source settles
	 *                         ^ result delivered
	 * ```
	 *
	 * @typeParam Res - Success callback result type; defaults to the source value type.
	 * @typeParam Rej - Error callback result type, returned when `throw` is false.
	 * @typeParam Throw - Whether source/manual rejections are rethrown; defaults to true.
	 *
	 * @param options - Per-call callbacks, rejection policy, and fallback settings.
	 * @returns The selected value or callback result. Source/manual rejections throw by default.
	 *
	 * @remarks
	 * Callback and fallback-factory exceptions reject this call regardless of `throw`.
	 * They are not passed to the `error` callback. Callbacks may add their own execution time.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const resolver = new Resolver<string>(fetch('https://example.com'));
	 *
	 * const response = await resolver.immediate({
	 *   throw: false,
	 *   fallbackAfter: 7000,
	 *   fallback: () => ({ error: 'offline' }),
	 *   error: (reason) => console.error(reason.message),
	 *   success: (value) => value.json(),
	 * });
	 * ```
	 */
	async immediate<Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>(
		...[options]: ResolverArguments<Value, Reason, Res, Rej, Throw>
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		return this.call(0, 0, options);
	}

	/**
	 * Waits for both source settlement and a minimum duration before delivering the outcome.
	 * If the source takes longer, delivers when it settles. The source itself is not delayed.
	 *
	 * ```text
	 * minimum(1000) - source settles early
	 *
	 * 0 ms          200 ms                     1000 ms
	 * |-------------|-------------------------|---->
	 * ^ call begins ^ source settles
	 *                                         ^ minimum ends
	 *                                         ^ result delivered
	 *
	 * minimum(1000) - source settles late
	 *
	 * 0 ms                    1000 ms          1500 ms
	 * |-----------------------|---------------|---->
	 * ^ call begins                           ^ source settles
	 *                         ^ minimum ends
	 *                                         ^ result delivered
	 * ```
	 *
	 * @typeParam Res - Success callback result type.
	 * @typeParam Rej - Error callback result type when `throw` is false.
	 * @typeParam Throw - Whether source/manual rejections are rethrown; defaults to true.
	 *
	 * @param minDelay - Minimum duration in milliseconds from this call; nonpositive values add no delay.
	 * @param options - Same callback, rejection, and fallback options as `immediate()`.
	 * @returns A promise for the selected value or callback result.
	 *
	 * @remarks
	 * A fallback bypasses the minimum only if the shared resolver is still pending
	 * when its timer expires. A settled source keeps the minimum delay.
	 * Durations are normalized by `Countdown.normalize()`; actual delivery follows the event loop.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const resolver = Resolver.resolve('ready');
	 * const value = await resolver.minimum(500); // Hold the value for at least 500 ms.
	 * ```
	 */
	async minimum<Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>(
		minDelay: number,
		...[options]: ResolverArguments<Value, Reason, Res, Rej, Throw>
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		return this.call(Countdown.normalize(minDelay), 0, options);
	}

	/**
	 * Checks for settlement after an initial delay and then at repeating intervals.
	 * Delivers at the first check that observes settlement. It does not rerun the source.
	 *
	 * ```text
	 * interval(500, 1000)
	 *
	 * 0 ms          500 ms         1500 ms   1800 ms   2500 ms
	 * |-------------|---------------|---------|-------|-------->
	 * ^ call begins                           ^ source settles
	 * <-- 500 ms --><--- 1000 ms ---><--- 1000 ms ---><--- 1000 ms --->
	 *               ^ first check   ^ second check    ^ third check
	 *                                                 ^ result delivered
	 * ```
	 *
	 * @typeParam Res - Success callback result type.
	 * @typeParam Rej - Error callback result type when `throw` is false.
	 * @typeParam Throw - Whether source/manual rejections are rethrown; defaults to true.
	 *
	 * @param minDelay - Milliseconds before the first check; nonpositive values add no initial delay.
	 * @param interval - Milliseconds between checks. Nonpositive values use minimum-delay behavior.
	 * @param options - Same callback, rejection, and fallback options as `immediate()`.
	 * @returns A promise for the selected value or callback result.
	 *
	 * @remarks
	 * Checks follow the event loop and can run late. A fallback bypasses this schedule
	 * only while the shared resolver is pending; timing does not limit callback execution.
	 *
	 * @example
	 * ```ts
	 * import { Resolver } from 'promise-cycle';
	 *
	 * const resolver = new Resolver(fetch('/api/data'));
	 * const response = await resolver.interval(500, 1000);
	 * ```
	 */
	async interval<Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>(
		minDelay: number,
		interval: number,
		...[options]: ResolverArguments<Value, Reason, Res, Rej, Throw>
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		return this.call(Countdown.normalize(minDelay), Countdown.normalize(interval), options);
	}

	private async call<Res, Rej, Throw extends boolean>(
		minDelay: number,
		interval: number,
		options?: Types.Options<Value, Reason, Res, Rej, Throw>,
	): Promise<ResolverReturn<Res, Rej, Throw>> {
		const process: CallProcess<Value, Reason> = {};
		const delays = this.scheduleChecks(process, minDelay, interval);
		const fallback = this.scheduleFallback(process, options);

		const finish = (outcome: ResolverOutcome<Value, Reason>) => {
			if (process.outcome) return process.outcome;
			process.outcome = outcome;
			process.delays?.destroy();
			process.fallback?.destroy();
			return outcome;
		};

		const outcome = await new Promise<ResolverOutcome<Value, Reason>>((resolve, reject) => {
			Promise.all([this.state.promise, delays]).then(([outcome]) => resolve(finish(outcome))); // prettier-ignore
			fallback.then((outcome) => outcome && resolve(finish(outcome)), (error) => reject(finish(error))); // prettier-ignore
		});

		const onSuccess = options?.success;

		if (outcome.status === 'fulfilled' && onSuccess) {
			return await onSuccess(outcome.value, outcome.source);
		}

		if (outcome.status === 'fulfilled') {
			return outcome.value as ResolverReturn<Res, Rej, Throw>;
		}

		const result = await options?.error?.(outcome.reason as unknown as Reason, outcome.source);
		if (options?.throw ?? true) throw outcome.reason;
		return result as ResolverReturn<Res, Rej, Throw>;
	}

	private async scheduleChecks(process: CallProcess<Value, Reason>, minDelay: number, interval: number): Promise<void> {
		if (Countdown.isValid(minDelay)) {
			process.delays = process.delays ?? new Countdown(minDelay);
			await process.delays.waiting;
		}

		if (Countdown.isValid(interval) && !process.delays?.destroyed) {
			process.delays = process.delays ?? new Countdown();
			while (!process.delays.destroyed && this.isPending()) {
				await process.delays.reset(interval);
			}
		}
	}

	private async scheduleFallback<Res, Rej, Throw extends boolean>(
		process: CallProcess<Value, Reason>,
		options?: Types.Options<Value, Reason, Res, Rej, Throw>,
	): Promise<ResolverOutcome<Value, Reason> | undefined> {
		const fallbackAfter = Countdown.normalize(options?.fallbackAfter);

		if (Countdown.isValid(fallbackAfter) && this.isPending()) {
			process.fallback = process.fallback ?? new Countdown(fallbackAfter);
			await process.fallback.waiting;
		}

		if (process.fallback && !process.fallback.destroyed && this.isPending()) {
			const fallback = options?.fallback;
			const value = typeof fallback === 'function' ? (fallback as () => Awaited<Value>)() : fallback;
			return { status: 'fulfilled', value: value as Awaited<Value>, source: 'fallback' };
		}
	}
}
