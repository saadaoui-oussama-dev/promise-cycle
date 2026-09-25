# Resolver API

[Home][home] · [Documentation][docs] · [Countdown API][countdown-api] · [Types][types]

## Construction

```ts
import { Resolver } from 'promise-cycle';

const manual = new Resolver<string, Error>();
const fromValue = new Resolver(42);
const fromPromise = new Resolver(Promise.resolve('ready'));
```

| Signature | Return |
| --- | --- |
| `new Resolver<Value = any, Reason = unknown>()` | Pending resolver for manual settlement |
| `new Resolver<Value, Reason>(source: Promise<Value> \| Awaited<Value>)` | Resolver observing the supplied source |
| `Resolver.resolve()` | `Resolver<undefined>` |
| `Resolver.resolve<Value>(value: Value \| PromiseLike<Value>)` | `Resolver<Awaited<Value>>` |
| `Resolver.reject()` | `Resolver<never, undefined>` |
| `Resolver.reject<Reason>(reason: Reason)` | `Resolver<never, Reason>` |

Functions are preserved as values, not invoked. Static `resolve` adopts promises and thenables; static `reject` preserves its reason as supplied. See [inputs][getting-started] and [shared state][settlement].

## Waiting methods

All instance strategies have these generic parameters:

```text
<Res = Awaited<Value>, Rej = undefined, Throw extends boolean = true>
```

Static strategies prepend `Value, Reason = unknown`. Their first argument is `Promise<Value> | Awaited<Value>`.

| Instance | Static equivalent |
| --- | --- |
| `immediate(options?)` | `Resolver.immediate(source, options?)` |
| `minimum(minDelay: number, options?)` | `Resolver.minimum(source, minDelay, options?)` |
| `interval(minDelay: number, interval: number, options?)` | `Resolver.interval(source, minDelay, interval, options?)` |

Options use `Types.Options<Value, Reason, Res, Rej, Throw>`. When `Res` differs from `Awaited<Value>`, options and the success callback are required. The returned promise fulfills with `Awaited<Res>`, plus `Awaited<Rej>` when `Throw` is false. Rejected calls follow the [error policy][callbacks].

[Strategy diagrams][strategies] · [Fallbacks][fallbacks] · [Options and generics][types]

## Settlement and state

| Member | Type |
| --- | --- |
| `resolve(value)` | `(value: Awaited<Value>) => void` |
| `reject(reason)` | `(reason: Reason) => void` |
| `waiting` | `Promise<Awaited<Value>>` |
| `status` | `Types.Status` |
| `source` | `Types.Source \| 'pending'` |
| `isPending()` | `boolean` |
| `isFulfilled()` | `boolean` |
| `isRejected()` | `boolean` |

First settlement wins. Per-call callbacks and fallbacks do not change shared state. [Read the settlement guide][settlement].

**Next:** [Countdown API][countdown-api] · [Types][types]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[countdown-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/countdown.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
[getting-started]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/getting-started.md
[settlement]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/settlement.md
[callbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/callbacks.md
[strategies]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/strategies.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
