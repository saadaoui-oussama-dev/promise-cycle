# Timing strategies

[Home][home] · [Documentation][docs] · [Resolver API][resolver-api]

All three strategies wait on the same source/manual outcome. They differ in when that outcome is delivered. Their timing applies to both fulfillment and rejection, before callbacks execute.

## Immediate

`immediate(options?)` adds no timing hold.

```text
0 ms                    300 ms
|-----------------------|---->
^ call begins           ^ source settles
                        ^ result delivered
```

```ts
import { Resolver } from 'promise-cycle';

const resolver = new Resolver(Promise.resolve('ready'));
console.log(await resolver.immediate());
```

Static form: `Resolver.immediate(source, options?)`.

## Minimum

`minimum(minDelay, options?)` waits for both settlement and the minimum duration. Use it to give loading states a stable visible period.

```text
minimum(1000): fast source

0 ms          200 ms                     1000 ms
|-------------|-------------------------|---->
^ call begins ^ source settles          ^ minimum ends
                                        ^ result delivered

minimum(1000): slow source

0 ms                    1000 ms          1500 ms
|-----------------------|---------------|---->
^ call begins           ^ minimum ends  ^ source settles
                                        ^ result delivered
```

```ts
import { Resolver } from 'promise-cycle';

const result = await Resolver.minimum(Promise.resolve('ready'), 400);
console.log(result);
```

Static form: `Resolver.minimum(source, minDelay, options?)`.

Start the waiting call when the loading indicator becomes visible. A later call starts a new minimum period, even if the shared source has already settled.

## Interval

`interval(minDelay, interval, options?)` checks once after `minDelay`, then waits `interval` between checks while the source is pending. Delivery occurs at the first check that observes settlement.

```text
interval(500, 1000)

0 ms          500 ms           1200 ms       1500 ms
|-------------|---------------|-------------|---->
^ call begins ^ first check   ^ source      ^ next check
              ^ pending         settles     ^ result delivered
              |<--------- 1000 ms --------->|
```

```ts
import { Resolver } from 'promise-cycle';

const response = await Resolver.interval(fetch('/api/data'), 500, 1000);
console.log(response.status);
```

Static form: `Resolver.interval(source, minDelay, interval, options?)`.

This observes one operation. It does not poll a server, retry a request, or invoke a function repeatedly. A nonpositive interval uses minimum-wait behavior. A zero initial delay starts checking immediately.

## Timing boundaries

- Every waiting call has its own schedule, measured from that call.
- A [fallback][fallbacks] can bypass the schedule only while the shared resolver remains pending. If the source has settled, the normal timing hold remains.
- Timers follow the JavaScript event loop and can run late. Repeated checks can drift relative to a CSS animation; exact frame coordination belongs in your animation API.
- The waiting schedule does not limit callback execution time.
- Durations are normalized using [Countdown.normalize][countdown-api].

**Previous:** [Getting started][getting-started] · **Next:** [UI recipes][ui]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
[countdown-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/countdown.md
[getting-started]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/getting-started.md
[ui]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/recipes/ui.md
