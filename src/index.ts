/**
 * Callbacks invoked when a resolver's underlying value is fulfilled or rejected.
 *
 * @remarks
 * Both callbacks are optional. Only the callback corresponding to the
 * outcome of the underlying promise is invoked.
 *
 * Callbacks passed to the {@link Resolver} constructor are invoked when
 * the underlying value settles, regardless of which resolver method is
 * used afterward.
 *
 * Callbacks passed to {@link Resolver.resolve}, {@link Resolver.after},
 * or {@link Resolver.steps} apply to that specific call.
 *
 * @example
 * ```ts
 * const resolver = new Resolver(fetch('/api/data'), {
 *   onResolve: (response) => console.log('Loaded:', response),
 *   onReject: (error) => console.error('Failed:', error),
 * });
 * ```
 */
export type ResolverCallbacks<T, Error = unknown> = {
	/**
	 * Called when the underlying value is successfully resolved.
	 *
	 * @param value - The resolved value.
	 */
	onResolve?: (value: Awaited<T>) => void;

	/**
	 * Called when the underlying value is rejected.
	 *
	 * @param error - The rejection reason.
	 */
	onReject?: (error: Error) => void;
};

/**
 * Defines the resolved value type based on whether rejection errors are thrown.
 *
 * @typeParam T - The type of the value being resolved.
 * @typeParam Throw - Whether rejected operations are rethrown.
 *
 * When `Throw` is `false`, the result can be `undefined` when the operation
 * rejects. When `Throw` is `true`, the result is always the awaited value.
 */
type ResolverReturn<T, Throw extends boolean> = Throw extends false ? Awaited<T> | undefined : Awaited<T>;

/**
 * Wraps a value or promise and provides different strategies for controlling
 * when its result is returned.
 *
 * `Resolver` is useful when an asynchronous operation should be resolved
 * immediately, after a minimum amount of time, or on a periodic timing cycle.
 *
 * The underlying value starts resolving as soon as the `Resolver` is created.
 * The resolver methods do not delay the execution of the underlying operation;
 * they only control when its result is returned to the caller.
 *
 * @remarks
 * The constructor accepts a promise, a synchronous value, or a function that
 * creates a promise.
 *
 * When a function is provided, it is invoked immediately during construction.
 * This can be useful when the operation itself should be created lazily
 * relative to evaluating the constructor argument.
 *
 * The resolver keeps track of both successful and rejected outcomes.
 * Rejections are never converted into successful results: methods that wait
 * for the result will rethrow the original rejection reason.
 *
 * Once the underlying value has settled, its result is stored by the resolver.
 * Subsequent timing methods can therefore use the already-settled result
 * without starting the underlying operation again.
 *
 * @example
 * Resolve immediately:
 *
 * ```ts
 * const resolver = new Resolver(fetch('/api/data'));
 *
 * const response = await resolver.resolve();
 * ```
 *
 * @example
 * Ensure that resolution takes at least 2 seconds:
 *
 * ```ts
 * const resolver = new Resolver(fetch('/api/data'));
 *
 * const response = await resolver.after(2000);
 * ```
 *
 * The `fetch` operation starts immediately, but the returned promise does not
 * resolve until both the fetch and the 2-second minimum time have completed.
 *
 * @example
 * Resolve on a periodic timing cycle:
 *
 * ```ts
 * const resolver = new Resolver(fetch('/api/data'));
 *
 * const response = await resolver.steps(500, 1000);
 * ```
 *
 * This waits 500 milliseconds before checking the result. If the underlying
 * operation has not settled yet, it checks again every 1000 milliseconds
 * until it has settled.
 *
 * @example
 * Provide callbacks when creating the resolver:
 *
 * ```ts
 * const resolver = new Resolver(fetch('/api/data'), {
 *   onResolve: (response) => {
 *     console.log('Request completed:', response);
 *   },
 *   onReject: (error) => {
 *     console.error('Request failed:', error);
 *   },
 * });
 *
 * const response = await resolver.after(1000);
 * ```
 *
 * @example
 * Provide callbacks for a specific resolution:
 *
 * ```ts
 * const resolver = new Resolver(fetch('/api/data'));
 *
 * const response = await resolver.steps(500, 1000, {
 *   onResolve: (response) => {
 *     console.log('Resolved:', response);
 *   },
 *   onReject: (error) => {
 *     console.error('Rejected:', error);
 *   },
 * });
 * ```
 */
export class Resolver<T, Throw extends boolean = true, Error = unknown> {
	/**
	 * The successfully resolved value stored by the resolver.
	 *
	 * This is populated when the underlying promise fulfills and allows the
	 * resolver to return the already-resolved value from its timing methods.
	 */
	private value?: Awaited<T>;

	/**
	 * The rejection reason produced by the underlying promise.
	 *
	 * This is populated when the underlying promise rejects and is rethrown
	 * when the resolver returns its result.
	 */
	private error?: unknown;

	/**
	 * Indicates whether the underlying promise has settled.
	 *
	 * A promise is considered settled after either a successful fulfillment
	 * or a rejection. This allows timing strategies such as {@link steps} to
	 * stop waiting for both successful and failed operations.
	 */
	private settled = false;

	/**
	 * Indicates whether the resolver should rethrow the rejection reason.
	 *
	 * By default, the resolver rethrows the rejection reason when the
	 * underlying promise is rejected. This can be disabled by setting
	 * `throw` to `false`.
	 */
	private throw = true;

	/**
	 * The normalized promise tracked by the resolver.
	 *
	 * Synchronous values and promise-returning inputs are normalized into a
	 * promise so that all resolution strategies can use the same asynchronous
	 * representation.
	 */
	private promise: Promise<Awaited<T>>;

	/**
	 * Creates a delay promise that resolves after the specified amount of time.
	 *
	 * @param time - The delay duration in milliseconds.
	 * @returns A promise that resolves after `time` milliseconds.
	 *
	 * @example
	 * ```ts
	 * await Resolver.sleep(1000);
	 *
	 * console.log('One second has passed');
	 * ```
	 */
	static sleep(time: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, time));
	}

	/**
	 * Creates a resolver for a value or asynchronous operation.
	 *
	 * The supplied operation begins immediately when a promise is provided.
	 * When a function is provided, the function is invoked during construction
	 * and its returned promise becomes the value tracked by the resolver.
	 *
	 * The resolver listens for both fulfillment and rejection, stores the
	 * corresponding result, and invokes the matching callbacks when the
	 * underlying operation settles.
	 *
	 * @param promise - A value, promise, or function that returns a promise
	 * to be tracked by the resolver.
	 * @param callbacks - Optional callbacks invoked when the underlying
	 * operation fulfills or rejects.
	 *
	 * @example
	 * ```ts
	 * const resolver = new Resolver(fetch('/api/data'), {
	 *   onResolve: (response) => console.log('Loaded:', response),
	 *   onReject: (error) => console.error('Failed:', error),
	 * });
	 * ```
	 *
	 * @example
	 * A function can be supplied when the promise should be created by the
	 * resolver:
	 *
	 * ```ts
	 * const resolver = new Resolver(() => fetch('/api/data'));
	 * ```
	 */
	constructor(promise: Promise<T> | T | (() => Promise<T>), options?: { throw?: Throw } & ResolverCallbacks<T, Error>) {
		const value = typeof promise === 'function' ? (promise as () => Promise<T>)() : promise;

		this.promise = Promise.resolve(value);
		this.throw = options && typeof options.throw === 'boolean' ? !!options.throw : true;

		this.promise.then(
			(value) => {
				this.value = value;
				this.settled = true;
				options?.onResolve?.(value);
			},
			(error) => {
				this.error = error;
				this.settled = true;
				options?.onReject?.(error);
			},
		);
	}

	/**
	 * Resolves as soon as the underlying value resolves or rejects.
	 *
	 * This method does not add any delay.
	 *
	 * @param callbacks - Optional callbacks for this resolution.
	 * @returns A promise containing the resolved value.
	 * @throws The original rejection reason if the underlying value is rejected.
	 *
	 * @example
	 * ```ts
	 * const resolver = new Resolver(fetch('/api/data'));
	 *
	 * const response = await resolver.resolve({
	 *   onResolve: (response) => console.log('Success:', response),
	 *   onReject: (error) => console.error('Error:', error),
	 * });
	 * ```
	 */
	async resolve<E = Error>(callbacks?: ResolverCallbacks<T, E>): Promise<ResolverReturn<T, Throw>> {
		return this.promise.then(
			(value) => {
				callbacks?.onResolve?.(value);
				return value;
			},
			(error) => {
				callbacks?.onReject?.(error);

				if (this.throw) throw error;

				return undefined;
			},
		) as Promise<ResolverReturn<T, Throw>>;
	}

	/**
	 * Resolves only after the underlying value has settled and the minimum
	 * amount of time has elapsed.
	 *
	 * The underlying operation starts immediately when the resolver is created.
	 * If it finishes before `minTime`, the result is held until `minTime` has
	 * elapsed. If it takes longer than `minTime`, it resolves as soon as the
	 * underlying operation settles.
	 *
	 * @param minTime - The minimum amount of time to wait, in milliseconds.
	 * @param callbacks - Optional callbacks for this resolution.
	 * @returns A promise containing the resolved value.
	 * @throws The original rejection reason if the underlying value is rejected.
	 *
	 * @example
	 * ```ts
	 * const resolver = new Resolver(fetch('/api/data'));
	 *
	 * // The result will not be returned before 2 seconds.
	 * const response = await resolver.after(2000);
	 * ```
	 *
	 * @example
	 * ```ts
	 * const response = await resolver.after(1000, {
	 *   onResolve: (response) => console.log('Loaded:', response),
	 *   onReject: (error) => console.error('Failed:', error),
	 * });
	 * ```
	 */
	async after<E = Error>(minTime: number, callbacks?: ResolverCallbacks<T, E>): Promise<ResolverReturn<T, Throw>> {
		await Promise.all([this.promise.catch(() => undefined), Resolver.sleep(minTime)]);

		return this.result<E>(callbacks);
	}

	/**
	 * Resolves on a periodic timing cycle after an initial minimum delay.
	 *
	 * The resolver first waits for `minTime`. It then checks whether the
	 * underlying value has settled. If it has not settled, another `interval`
	 * interval is waited before checking again.
	 *
	 * This means the result is returned on the first periodic check at which
	 * the underlying operation has already settled.
	 *
	 * The underlying operation itself is never paused or restarted.
	 *
	 * @param minTime - The initial delay before the first check, in milliseconds.
	 * @param interval - The interval between subsequent checks, in milliseconds.
	 * @param callbacks - Optional callbacks for this resolution.
	 * @returns A promise containing the resolved value.
	 * @throws The original rejection reason if the underlying value is rejected.
	 *
	 * @example
	 * ```ts
	 * const resolver = new Resolver(fetch('/api/data'));
	 *
	 * // Wait 500ms, then check every 1000ms.
	 * const response = await resolver.steps(500, 1000);
	 * ```
	 *
	 * If the request finishes after 400ms, the result is returned at the
	 * 500ms check without entering the periodic loop.
	 *
	 * If the request finishes after 750ms, the result is returned at the
	 * 1500ms check rather than immediately at 750ms.
	 *
	 * @example
	 * ```ts
	 * const response = await resolver.steps(500, 1000, {
	 *   onResolve: (response) => console.log('Loaded on interval:', response),
	 *   onReject: (error) => console.error('Failed:', error),
	 * });
	 * ```
	 */
	async steps<E = Error>(
		minTime: number,
		interval: number,
		callbacks?: ResolverCallbacks<T, E>,
	): Promise<ResolverReturn<T, Throw>> {
		await Resolver.sleep(minTime);

		while (!this.settled) {
			await Resolver.sleep(interval);
		}

		return this.result<E>(callbacks);
	}

	/**
	 * Returns the stored result and invokes the callbacks for the current
	 * resolution.
	 *
	 * If the underlying operation was rejected, its original rejection reason
	 * is passed to `onReject` and then rethrown.
	 *
	 * If the underlying operation was fulfilled, the stored value is passed to
	 * `onResolve` and returned.
	 *
	 * @typeParam E - The type of the rejection reason expected by the callbacks.
	 *
	 * @param callbacks - Optional callbacks invoked for the stored result.
	 *
	 * @returns The successfully resolved value.
	 *
	 * @throws The original rejection reason when the underlying operation
	 * was rejected.
	 */
	private result<E = Error>(callbacks?: ResolverCallbacks<T, E>): ResolverReturn<T, Throw> {
		if (this.error !== undefined) {
			callbacks?.onReject?.(this.error as E);

			if (this.throw) throw this.error;

			return undefined as ResolverReturn<T, Throw>;
		}

		callbacks?.onResolve?.(this.value!);

		return this.value!;
	}
}
