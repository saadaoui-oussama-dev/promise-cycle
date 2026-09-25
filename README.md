# promise-cycle

**Let the work finish when it can. Show the result when your UI is ready.**

`promise-cycle` gives asynchronous results a timing policy. Keep a loading indicator visible long enough to avoid a distracting flash, reveal content at the end of an animation cycle, or use a fallback while an operation is still pending.

`Resolver` shares one result across independently timed waits. `Countdown` provides reusable, stoppable countdowns for the rest of your application.

[Get started][getting-started] · [Documentation][docs] · [UI recipes][ui] · [API reference][resolver-api]

## Install

```sh
npm install promise-cycle
```

TypeScript declarations, ES modules, and CommonJS exports are included. No runtime dependencies.

## Quick start

Keep a loading state visible for at least 400 ms, even when the request finishes quickly:

```ts
import { Resolver } from 'promise-cycle';

await Resolver.minimum(fetch('/api/message'), 400, {
  throw: false,
  success: async (response) => {
    const message = await response.text();
    console.log(message);
  },
  error: (reason) => {
    console.error('Could not load the message:', reason);
  },
});
```

The request starts immediately. A fast result waits for the minimum; a slow result is delivered when it arrives. [See the timing diagrams][strategies].

If the request is still pending after 3 seconds, the fallback response goes through
`success`. Rejections go through `error`; `throw: false` prevents the original
rejection from being rethrown. The fallback is a `Response` to match `fetch()`.

## What you can build

| Need | Feature | Guide |
| --- | --- | --- |
| Avoid a loading indicator appearing and disappearing in a flash | `minimum(ms)` | [Minimum visibility][ui] |
| Reveal content between repeating animation cycles | `interval(firstCheck, period)` | [Animation timing][ui] |
| Use the result as soon as it is available | `immediate()` | [Strategies][strategies] |
| Show placeholder or cached data during a long wait | `fallbackAfter` and `fallback` | [Fallbacks][fallbacks] |
| Transform data and handle typed errors per caller | `success`, `error`, `throw` | [Callbacks][callbacks] |
| Complete a wait from a user action or application event | Manual `resolve()` and `reject()` | [Shared state][settlement] |
| Pause and resume a timer, read time remaining, or inspect its history | `Countdown` | [Countdown guide][countdown] |

## One operation, different presentation timings

```ts
import { Resolver } from 'promise-cycle';

const result = new Resolver(fetch('/api/message').then(response => response.text()));
const immediately = result.immediate();
const afterMinimum = result.minimum(400);
const onCycle = result.interval(600, 600);

await Promise.all([immediately, afterMinimum, onCycle]);
```

Each call has its own timing and options; the request runs once. Intervals check the existing result rather than repeat the operation. [Learn how shared settlement works][settlement].

## Quick API

Signatures below omit generic and conditional return details. Follow the links for the full contract.

| API | Reference |
| --- | --- |
| `new Resolver<Value, Reason>(source?)` | [Construction][resolver-api] |
| `Resolver.resolve(value?)`, `Resolver.reject(reason?)` | [Static constructors][resolver-api] |
| `Resolver.immediate(source, options?)` | [Immediate][strategies] |
| `Resolver.minimum(source, minDelay, options?)` | [Minimum][strategies] |
| `Resolver.interval(source, minDelay, interval, options?)` | [Interval][strategies] |
| `resolver.immediate(options?)` | [Strategies][strategies] |
| `resolver.minimum(minDelay, options?)` | [Strategies][strategies] |
| `resolver.interval(minDelay, interval, options?)` | [Strategies][strategies] |
| `resolver.resolve(value)`, `resolver.reject(reason)` | [Manual settlement][settlement] |
| `resolver.waiting`, `.status`, `.source` | [Resolver API][resolver-api] |
| `new Countdown(ms?, historySupported?)` | [Countdown API][countdown-api] |
| `counter.waiting`, `.remaining`, `.stop()`, `.resume()`, `.reset(ms?)`, `.destroy()` | [Countdown API][countdown-api] |
| `Countdown.sleep(ms?)`, `.normalize(value?)`, `.isValid(value?)` | [Countdown API][countdown-api] |
| `Types.Options`, `Types.Status`, `Types.Source`, `Types.CallSource`, `Types.History`, `Types.HistoryEntry` | [Types][types] |

## Documentation

Start with [installation and first use][getting-started], choose a [timing strategy][strategies], then explore [practical UI recipes][ui]. The [documentation home][docs] links every guide and reference page.

Timing controls result delivery; it does not cancel network requests or guarantee frame-exact rendering. See [timing behavior][strategies] and [fallback behavior][fallbacks].

## Project

[Source][repository] · [Report an issue][issues]

License: MIT.

[getting-started]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/getting-started.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[ui]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/recipes/ui.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[strategies]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/strategies.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
[callbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/callbacks.md
[settlement]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/settlement.md
[countdown]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/countdown/lifecycle.md
[countdown-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/countdown.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
[repository]: https://github.com/saadaoui-oussama-dev/promise-cycle
[issues]: https://github.com/saadaoui-oussama-dev/promise-cycle/issues
