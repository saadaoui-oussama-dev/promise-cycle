# Countdown lifecycle

[Home][home] · [Documentation][docs] · [Countdown API][countdown-api]

`Countdown` is a reusable wait with stop, resume, reset, and destruction controls. For a one-off wait, use `Countdown.sleep(ms)`.

## Start, stop, and resume

```ts
import { Countdown } from 'promise-cycle';

const counter = new Countdown(1000);
await Countdown.sleep(100);
counter.stop();

console.log(counter.remaining); // Approximately 900 ms.
await Countdown.sleep(200);
console.log(counter.remaining); // The same saved duration.

await counter.resume();
console.log(counter.finished); // true
```

`remaining` reports the actual remaining duration when read. Stopped time does not count. It returns zero when finished or destroyed. Values observed after real timers run are approximate because event-loop scheduling can vary.

`stop()` pauses an active timer; if the duration has already elapsed, it finishes instead. Repeated stop/resume calls have no additional effect. Resuming a finished countdown does not restart it.

## Reset a countdown

```ts
import { Countdown } from 'promise-cycle';

const counter = new Countdown(1000);
const originalWait = counter.waiting;
counter.reset(200);
console.log(counter.waiting === originalWait); // true while pending
await originalWait;

const nextWait = counter.reset(); // Another 200 ms countdown.
console.log(nextWait === originalWait); // false after completion
await nextWait;
```

Reset uses the supplied duration, or the last constructor/reset duration if omitted. It starts a full countdown even while stopped, and records a `started` event when history is enabled.

## Destroy and release waiting callers

```ts
import { Countdown } from 'promise-cycle';

const counter = new Countdown(1000);
const waiting = counter.waiting;
counter.destroy();
await waiting;

console.log(counter.destroyed); // true
console.log(counter.finished); // false: canceled before completion
```

Destruction fulfills the pending promise, cancels the timer, and permanently disables the instance. Later reset, stop, and resume calls do nothing. If the countdown had already finished, its `finished` flag remains true.

## State at a glance

| State | `running` | `stopped` | `finished` | `destroyed` | Waiting promise |
| --- | --- | --- | --- | --- | --- |
| Active | true | false | false | false | Pending |
| Stopped | false | true | false | false | Pending |
| Finished | false | false | true | false | Fulfilled |
| Destroyed before completion | false | false | false | true | Fulfilled |

Method equivalents are `isRunning()`, `isStopped()`, `isFinished()`, and `isDestroyed()`.

## Optional history

Enable history with the constructor's second argument:

```ts
import { Countdown, type Types } from 'promise-cycle';

const counter = new Countdown(100, true);
counter.stop();
const snapshot: Types.History = counter.getHistory();
await counter.resume();
console.log(snapshot); // Earlier snapshot is unchanged.
console.log(counter.history); // Includes subsequent events.
```

Each entry includes `event`, `at`, and `delay`. `stopped`, `finished`, and `destroyed` also include `remaining`. `finished` records zero remaining. Resume records the duration scheduled for that resumed segment.

Timestamps use `performance.now()` in milliseconds, not Unix dates. History is disabled by default. `historySupported` and `isHistorySupported()` report whether it was enabled. `history` and `getHistory()` return independent snapshots.

`clearHistory()` removes recorded entries without changing the countdown. `destroy()` clears prior history and records a final `destroyed` entry when history is enabled. Save a snapshot first if you want to retain earlier events.

## Duration rules

Positive durations are rounded to integers, clamped to at least 1 and at most 2,147,483,647 ms. Nonpositive or nonnumeric input becomes zero. A zero-duration countdown finishes immediately. See [normalization and validation][countdown-api] for the utility methods.

**Next:** [Countdown reference][countdown-api] · [History types][types]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[countdown-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/countdown.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
