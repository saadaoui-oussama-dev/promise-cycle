import type { Countdown } from './Countdown';

type IsEqual<T1, T2> = (<U>() => U extends T1 ? 1 : 0) extends <U>() => U extends T2 ? 1 : 0 ? true : false;

type Conditional<T, Opt extends boolean> = Opt extends true ? { [K in keyof T]?: T[K] } : { [K in keyof T]: T[K] };

/**
 * Timing resources and a selected outcome associated with one waiting call.
 * Consumers normally configure calls with {@link Types.Options} instead.
 *
 * @typeParam Value - Source value type.
 * @typeParam Reason - Source or manual rejection type.
 */
export type CallProcess<Value, Reason> = {
	/** Countdown governing minimum waits and periodic checks. */
	delays?: Countdown;
	/** Countdown governing fallback selection. */
	fallback?: Countdown;
	/** Outcome selected for this call, when available. */
	outcome?: ResolverOutcome<Value, Reason>;
};

/**
 * The options argument tuple accepted by a resolver's waiting methods.
 * Options may be omitted when the success result type matches the source value type.
 *
 * @typeParam Value - Source value type.
 * @typeParam Reason - Rejection type supplied to the error callback.
 * @typeParam Res - Success callback result type.
 * @typeParam Rej - Error callback result type.
 * @typeParam Throw - Whether source/manual rejections are rethrown.
 */
export type ResolverArguments<Value, Reason, Res, Rej, Throw extends boolean> = Conditional<
	[options: Types.Options<Value, Reason, Res, Rej, Throw>],
	IsEqual<Awaited<Value>, Awaited<Res>>
>;

/**
 * A fulfilled value or rejection reason together with its origin.
 * Narrow by `status` before reading `value` or `reason`.
 *
 * @typeParam Value - Source value type, unwrapped for fulfillment.
 * @typeParam Reason - Source or manual rejection type.
 */
export type ResolverOutcome<Value, Reason> =
	| {
			/** Identifies a fulfilled outcome. */
			status: 'fulfilled';
			/** Selected value, including a per-call fallback when applicable. */
			value: Awaited<Value>;
			/** Origin of the selected value. */
			source: Types.CallSource;
	  }
	| {
			/** Identifies a rejected outcome. */
			status: 'rejected';
			/** Original source or manual rejection reason. */
			reason: Reason;
			/** Origin of the rejection. */
			source: Types.Source;
	  };

/**
 * Fulfillment type of a waiting call's returned promise.
 * Includes the error callback result only when rejection propagation is disabled.
 *
 * @typeParam Res - Success result type.
 * @typeParam Rej - Error callback result type.
 * @typeParam Throw - Whether source/manual rejections are rethrown.
 */
export type ResolverReturn<Res, Rej, Throw extends boolean> = Throw extends false
	? Awaited<Res> | Awaited<Rej>
	: Awaited<Res>;

/**
 * Public types for resolver options, settlement state, and countdown history.
 * Import as `Types` or its descriptive alias `PromiseCycleTypes`.
 *
 * @example
 * ```ts
 * import type { PromiseCycleTypes } from 'promise-cycle';
 * const options: PromiseCycleTypes.Options<string> = {
 *   fallbackAfter: 1000,
 *   fallback: 'offline',
 * };
 * ```
 */
export namespace Types {
	/** `normal` identifies the constructor source; `manual` identifies `resolve()` or `reject()`. */
	export type Source = 'normal' | 'manual';
	/** Origin of a call's successful value, including its own `fallback`. */
	export type CallSource = 'normal' | 'manual' | 'fallback';
	/** Shared resolver state. A per-call fallback does not settle the shared resolver. */
	export type Status = 'pending' | 'fulfilled' | 'rejected';

	/**
	 * A read-only, chronological snapshot of a countdown's lifecycle events.
	 *
	 * Returned by `history` and `getHistory()`.
	 * Empty when history is disabled.
	 *
	 * New events and `clearHistory()` do not change previously obtained snapshots.
	 */
	export type History = readonly HistoryEntry[];

	/**
	 * One timestamped event from a history-enabled `Countdown`.
	 *
	 * Start and resume events describe the scheduled duration. Other events also
	 * report remaining time; a `finished` event always has zero remaining at runtime.
	 *
	 * @example
	 * ```ts
	 * import { Countdown, Types } from 'promise-cycle';
	 *
	 * const counter = new Countdown(100, true);
	 * counter.stop();
	 *
	 * const entries: Types.History = counter.history;
	 * for (const entry of entries) {
	 *   if ('remaining' in entry) console.log(entry.event, entry.remaining);
	 * }
	 * counter.destroy();
	 * ```
	 */
	export type HistoryEntry = {
		/** Event time in milliseconds from `performance.now()`, not a Unix timestamp. */
		readonly at: number;
		/** Duration scheduled by the latest start or resume, in milliseconds. */
		readonly delay: number;
	} & (
		| {
				/** `started` means construction or reset; `resumed` means continuation after a stop. */
				readonly event: 'started' | 'resumed';
		  }
		| {
				/** A pause, completed countdown, or permanent cancellation. */
				readonly event: 'stopped' | 'finished' | 'destroyed';
				/** Milliseconds remaining at this event. */
				readonly remaining: number;
		  }
	);

	/**
	 * Per-call callbacks, rejection policy, and fallback configuration.
	 *
	 * Fallbacks affect one waiting call without settling or canceling the shared source.
	 * `fallbackAfter` requires `fallback` unless `Value` accepts `undefined`.
	 * A fallback cannot be provided without `fallbackAfter`.
	 *
	 * @typeParam Value - Source value type.
	 * @typeParam Reason - Rejection reason passed to `error`; defaults to `unknown`.
	 * @typeParam Res - Success callback result; defaults to the awaited source value type.
	 * @typeParam Rej - Error callback result; defaults to `unknown` in this options type.
	 * @typeParam Throw - Rejection-propagation flag; waiting methods default to true.
	 *
	 * @example
	 * ```ts
	 * import { Resolver, type PromiseCycleTypes } from 'promise-cycle';
	 * const options: PromiseCycleTypes.Options<string> = {
	 *   fallbackAfter: 100,
	 *   fallback: () => 'offline',
	 *   success: (value, source) => { console.log(source); return value; },
	 * };
	 * const result = await new Resolver<string>().immediate(options);
	 * ```
	 */
	export type Options<Value, Reason = unknown, Res = Awaited<Value>, Rej = unknown, Throw extends boolean = boolean> = {
		/**
		 * Rethrow source/manual rejections after the error callback. Defaults to true.
		 * Set false to fulfill with the error callback's result, or undefined if absent.
		 * Callback and fallback-factory exceptions still reject the call.
		 */
		throw?: Throw;

		/**
		 * Handles source/manual rejection before applying `throw`.
		 * Its return value is used only when `throw` is false.
		 * Exceptions from factories or other callbacks are not routed here.
		 */
		error?: (error: Reason, source: Types.Source) => Rej;
	} & Conditional<
		{
			/**
			 * Transforms the selected successful value, including fallback values.
			 * Required when `Res` differs from the awaited source value type.
			 * Its result is awaited; an exception rejects the call without invoking `error`.
			 */
			success: (value: Awaited<Value>, source: Types.CallSource) => Res;
		},
		IsEqual<Awaited<Value>, Awaited<Res>>
	> &
		(
			| {
					/** Omit to disable the fallback timer. */
					fallbackAfter?: undefined;
					/** Fallback values require a fallbackAfter duration. */
					fallback?: never;
			  }
			| ({
					/**
					 * Milliseconds from the waiting call before fallback selection, if the source
					 * is still pending. Zero or invalid durations disable the timer.
					 * A selected fallback bypasses minimum/interval waits and uses the success path.
					 */
					fallbackAfter: number;
			  } & Conditional<
					{
						/**
						 * Replacement value or synchronous factory invoked only when fallback is needed.
						 * May be omitted when Value accepts undefined. Wrap function values in a factory.
						 * Factory exceptions reject the waiting call without invoking error.
						 */
						fallback: Awaited<Value> | (() => Awaited<Value>);
					},
					undefined extends Value ? true : false
			  >)
		);
}
