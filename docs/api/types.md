# Types and inference

[Home][home] · [Documentation][docs] · [Resolver API][resolver-api] · [Countdown API][countdown-api]

The package exports `Types` and the equivalent alias `PromiseCycleTypes` as type-only namespaces.

```ts
import type { Types, PromiseCycleTypes } from 'promise-cycle';

const status: Types.Status = 'pending';
const source: PromiseCycleTypes.CallSource = 'fallback';
```

## Status and origin

```ts
import type { Types } from 'promise-cycle';

type Status = Types.Status; // 'pending' | 'fulfilled' | 'rejected'
type Source = Types.Source; // 'normal' | 'manual'
type CallSource = Types.CallSource; // 'normal' | 'manual' | 'fallback'
```

[Shared state][settlement] uses `Status` and `Source`. Successful callbacks use `CallSource`; error callbacks receive `Source`.

## Options

```text
Types.Options<
  Value,
  Reason = unknown,
  Res = Awaited<Value>,
  Rej = unknown,
  Throw extends boolean = boolean
>
```

| Field | Type | Requirement |
| --- | --- | --- |
| `throw` | `Throw` | Optional; waiting methods default to true |
| `success` | `(value: Awaited<Value>, source: Types.CallSource) => Res` | Required when the success result type differs from the awaited source type |
| `error` | `(reason: Reason, source: Types.Source) => Rej` | Optional |
| `fallbackAfter` | `number` | Optional; required if a fallback is supplied |
| `fallback` | `Awaited<Value> \| (() => Awaited<Value>)` | Required with `fallbackAfter` unless `Value` accepts `undefined` |

```ts
import { Resolver, type Types } from 'promise-cycle';

const options: Types.Options<string> = {
  fallbackAfter: 100,
  fallback: () => 'offline',
};
const value = await new Resolver<string>().immediate(options);
```

The standalone options type defaults `Rej` to `unknown` and `Throw` to `boolean`. Waiting methods default `Rej` to `undefined` and `Throw` to `true`. Prefer inference for inline options, or specify the generics when you want a reusable options object with a particular return contract.

[Callback semantics][callbacks] · [Fallback constraints][fallbacks]

## Value and reason inference

```ts
import { Resolver } from 'promise-cycle';

const numberResult = new Resolver(42); // Resolver<number, unknown>
const manual = new Resolver<string, Error>();
const rejection = Resolver.reject(new Error('Unavailable')); // Resolver<never, Error>

const formatted = await numberResult.immediate<string>({
  success: value => value.toFixed(2),
});
manual.resolve(formatted);
await rejection.immediate({ throw: false, error: reason => reason.message });
```

The value type follows the supplied value or promise; an empty constructor defaults to `any`. Promise rejection types are not encoded in `Promise<T>`, so a normal source's reason defaults to `unknown`. Explicit generic types do not validate runtime data.

## History

`Types.History` is `readonly Types.HistoryEntry[]`. An entry has the following shape:

```ts
type HistoryEntry = {
  readonly at: number;
  readonly delay: number;
} & (
  | { readonly event: 'started' | 'resumed' }
  | {
      readonly event: 'stopped' | 'finished' | 'destroyed';
      readonly remaining: number;
    }
);
```

`at` uses `performance.now()`. `delay` is the duration scheduled for the latest start or resume. `remaining` is zero for `finished` at runtime, although its declared type is `number`.

Narrow before accessing fields that are not present on every entry:

```ts
import { Countdown } from 'promise-cycle';

const counter = new Countdown(100, true);
counter.stop();
for (const entry of counter.history) {
  if ('remaining' in entry) console.log(entry.remaining);
}
counter.destroy();
```

[History lifecycle and snapshots][countdown].

**Back to:** [Documentation home][docs]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[countdown-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/countdown.md
[settlement]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/settlement.md
[callbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/callbacks.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
[countdown]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/countdown/lifecycle.md
