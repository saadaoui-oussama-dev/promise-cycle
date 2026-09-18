# Resolver

A small TypeScript utility for controlling when an asynchronous result is resolved.

`Resolver` wraps a value or promise and provides different resolution strategies:

- **Immediate** — resolve as soon as the operation settles.
- **Minimum delay** — wait at least a specified amount of time.
- **Periodic steps** — check for completion at regular intervals.
- **Callbacks** — react to both successful and rejected operations.
- **Stored result** — keep the settled result so resolution strategies can reuse it.

## Installation

```bash
npm install promise-cycle
````

## Quick Start

```ts
import { Resolver } from 'promise-cycle';

const resolver = new Resolver(fetch('/api/data'));

const response = await resolver.resolve();
```

The underlying operation starts immediately when the `Resolver` is created.

---

## Resolution Strategies

### `after(minTime)`

Ensures that the result is not returned before the specified minimum amount of time.

```ts
const resolver = new Resolver(fetch('/api/data'));

const response = await resolver.after(2000);
```

If the request finishes after 500 ms, the result is held until 2000 ms.

If the request takes 3000 ms, the result is returned when the request finishes.

In other words:

```text
Operation:  |------500ms------|
Minimum:    |---------2000ms---------|
Result:                              ✓
```

```text
Operation:  |------------3000ms------------|
Minimum:    |---------2000ms---------|
Result:                                    ✓
```

The operation itself is **not delayed**.

---

### `steps(minTime, interval)`

Resolves the result according to a periodic timing cycle.

```ts
const resolver = new Resolver(fetch('/api/data'));

const response = await resolver.steps(500, 1000);
```

The resolver:

1. Waits for `minTime`.
2. Checks whether the operation has settled.
3. If it has not settled, waits `interval`.
4. Checks again.
5. Continues until the operation has settled.

For example:

```text
0ms       500ms       1500ms       2500ms
 |----------|------------|------------|
            ↑            ↑            ↑
          check        check        check
```

If the operation settles at `1200ms`, `steps(500, 1000)` returns it at the `1500ms` check.

This is useful when resolution should align with periodic UI updates, animation cycles, polling intervals, or other timing boundaries.

---

### `resolve()`

Resolves immediately when the underlying operation settles.

```ts
const resolver = new Resolver(fetch('/api/data'));

const response = await resolver.resolve();
```

No additional delay or timing strategy is applied.

This behaves like directly awaiting the original operation:

```ts
const response = await fetch('/api/data');
```

---

## Callbacks and Behavior Controls

Callbacks can be provided when creating the resolver or when calling an individual resolution method.

### Constructor callbacks and controls

Callbacks provided to the constructor are invoked when the underlying operation settles:

```ts
const resolver = new Resolver(fetch('/api/data'), {
	throw: false,

	onResolve: (response) => {
		console.log('Request completed:', response);
	},

	onReject: (error) => {
		console.error('Request failed:', error);
	},
});
```

### Method callbacks

Callbacks can also be provided to individual resolution methods:

```ts
const resolver = new Resolver(fetch('/api/data'));

const response = await resolver.steps(500, 1000, {
	onResolve: (response) => {
		console.log('Resolved:', response);
	},

	onReject: (error) => {
		console.error('Rejected:', error);
	},
});
```

Method callbacks apply only to that specific resolution call.

### `onResolve`

Called when the underlying operation fulfills.

```ts
onResolve: (value) => {
	console.log(value);
}
```

### `onReject`

Called when the underlying operation rejects.

```ts
onReject: (error) => {
	console.error(error);
}
```

By default, rejected operations are propagated to the caller after `onReject` is invoked:

```ts
try {
	await resolver.after(1000);
} catch (error) {
	console.error('The operation failed:', error);
}
```

### `throw`

The `throw` option is available **only in the constructor** and controls whether a rejection is propagated by the resolver.

```ts
const resolver = new Resolver(fetch('/api/data'), {
	throw: false,

	onReject: (error) => {
		console.error('Request failed:', error);
	},
});
```

When `throw` is `true`, the original rejection is propagated normally.

When `throw` is `false`, the rejection is handled by the resolver after `onReject` is invoked and is not rethrown by the resolver.

The default behavior is:

```ts
throw: true
```

`throw` cannot be provided to `resolve()`, `after()`, or `steps()`. Those methods accept callbacks only.

---

## Values, Promises, and Promise Factories

`Resolver` accepts a promise, a synchronous value, or a function returning a promise.

### Promise

```ts
const resolver = new Resolver(fetch('/api/data'));
```

### Value

```ts
const resolver = new Resolver(42);

const value = await resolver.resolve(); // 42
```

### Promise factory

```ts
const resolver = new Resolver(() => fetch('/api/data'));
```

The function is invoked when the `Resolver` is constructed.

This can be useful when the operation needs to be created through a function rather than being supplied as an already-created promise.

---

## Reusing a Resolver

A `Resolver` tracks a single underlying operation.

```ts
const resolver = new Resolver(fetch('/api/data'));

const immediate = await resolver.resolve();
```

The same resolver can then be used with another resolution strategy:

```ts
const response = await resolver.steps(500, 1000);
```

The underlying operation is not restarted by calling different resolver methods.

Once the operation settles, its result is stored by the resolver.

---

## `Resolver.sleep()`

`Resolver.sleep()` is a small promise-based delay utility.

```ts
await Resolver.sleep(1000);

console.log('One second has passed');
```

It returns a `Promise<void>` that resolves after the specified number of milliseconds.

```ts
const promise = Resolver.sleep(500);
```

---

## API

### `new Resolver(promise, (controls & callbacks)?)`

```ts
const instance = new Resolver<T, E>(
	promise: Promise<T> | T | (() => Promise<T>),
	callbacks?: { throw: boolean } & ResolverCallbacks<T, E>,
)
```

### `resolve(callbacks?)`

```ts
instance.resolve(callbacks?: ResolverCallbacks<T, E>): Promise<T>
```

Resolves as soon as the underlying operation settles.

### `after(minTime, callbacks?)`

```ts
instance.after(
	minTime: number,
	callbacks?: ResolverCallbacks<T, E>,
): Promise<T>
```

Waits for both the underlying operation and the minimum time to complete.

### `steps(minTime, interval, callbacks?)`

```ts
instance.steps(
	minTime: number,
	interval: number,
	callbacks?: ResolverCallbacks<T, E>,
): Promise<T>
```

Waits for `minTime`, then checks for completion periodically using `step` as the interval.

### `Resolver.sleep(time)`

```ts
Resolver.sleep(time: number): Promise<void>
```

Creates a promise that resolves after `time` milliseconds.

---

## TypeScript

`Resolver` is fully generic and preserves the type of the wrapped value.

```ts
const resolver = new Resolver(Promise.resolve({
	id: 1,
	name: 'Example',
}));

const value = await resolver.resolve();

value.id;
value.name;
```

Callback values are typed automatically:

```ts
new Resolver(Promise.resolve('hello'), {
	onResolve: (value) => {
		// value: string
		console.log(value);
	},
});
```

---

## Why Resolver?

Normally, awaiting a promise means that its result is returned as soon as the promise settles.

Sometimes the **operation's completion time** and the **desired resolution time** are separate concerns.

For example:

```ts
const data = await fetchData();
```

may complete too quickly for a UI transition, loading indicator, animation cycle, or periodic update.

`Resolver` lets you keep the operation running normally while controlling when its result becomes available:

```ts
const resolver = new Resolver(fetchData());

await resolver.resolve();       // Immediately
await resolver.after(1000);     // At least 1 second
await resolver.steps(500, 500); // Periodic resolution
```
