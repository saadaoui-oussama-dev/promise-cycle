# Countdown API

[Home][home] · [Documentation][docs] · [Resolver API][resolver-api] · [Lifecycle guide][countdown]

## Construction and controls

| Signature | Return |
| --- | --- |
| `new Countdown(delay?: number, historySupported = false)` | Countdown that starts immediately |
| `reset(delay?: number)` | `Promise<void>` |
| `resume()` | `Promise<void>` |
| `stop()` | `void` |
| `destroy()` | `void` |
| `clearHistory()` | `void` |
| `getHistory()` | `Types.History` |

`reset()` defaults to the last constructor/reset duration. Pending waits are preserved across stop, resume, and reset. A reset after completion creates a new promise. Destruction releases waiters and prevents restarting. [Lifecycle examples][countdown].

## Properties and predicates

| Property | Type | Method equivalent |
| --- | --- | --- |
| `waiting` | `Promise<void>` | — |
| `remaining` | `number` | — |
| `running` | `boolean` | `isRunning(): boolean` |
| `stopped` | `boolean` | `isStopped(): boolean` |
| `finished` | `boolean` | `isFinished(): boolean` |
| `destroyed` | `boolean` | `isDestroyed(): boolean` |
| `historySupported` | `boolean` | `isHistorySupported(): boolean` |
| `history` | `Types.History` | `getHistory(): Types.History` |

`remaining` reports time at the moment of reading, preserves paused time, and is zero after completion or destruction. [State and history details][countdown].

## Static utilities

| Signature | Return |
| --- | --- |
| `Countdown.sleep(delay?: number)` | `Promise<void>` |
| `Countdown.normalize(value?: any, fallbackIsDigitOne = false)` | `number` |
| `Countdown.isValid(delay?: any)` | `delay is number` |

`sleep()` waits once. Omitted or nonpositive durations resolve immediately.

`normalize()` rounds positive numeric input to an integer from 1 through 2,147,483,647. Nonnumeric values, `NaN`, and nonpositive numbers become zero, or one when `fallbackIsDigitOne` is true. Numeric strings are not converted. Positive infinity is clamped to the maximum.

`isValid()` checks for a numeric value from 1 through 2,147,483,647, inclusive. It accepts fractions in that range without rounding.

```ts
import { Countdown } from 'promise-cycle';

Countdown.normalize(2.7); // 3
Countdown.normalize(undefined, true); // 1
Countdown.normalize('100'); // 0
Countdown.isValid(0.5); // false
Countdown.isValid(1.5); // true
await Countdown.sleep(100);
```

**Next:** [Types and inference][types]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[countdown]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/countdown/lifecycle.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
