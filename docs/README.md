# Documentation

[Package home][home] · [Get started][getting-started] · [Resolver API][resolver-api] · [Countdown API][countdown-api]

`promise-cycle` separates the completion of an operation from the moment a caller receives its result. Start with `Resolver` for asynchronous UI flows, or use `Countdown` for a controllable wait.

## Start here

1. [Install and run your first example][getting-started].
2. [Choose immediate, minimum, or interval timing][strategies].
3. [Apply the patterns to loading states and animations][ui].

## Resolver guides

| Page | What you will learn |
| --- | --- |
| [Timing strategies][strategies] | Delivery rules, diagrams, and timing boundaries |
| [Callbacks and errors][callbacks] | Transforming values, recovering from rejection, and callback failures |
| [Fallbacks][fallbacks] | Per-call replacement values, factories, and data origins |
| [Shared state and manual settlement][settlement] | Reusing one result and settling from application events |
| [UI recipes][ui] | Minimum loading visibility and cycle-based presentation |

## Countdown guide

[Countdown lifecycle][countdown] covers stopping, resuming, resetting, destruction, remaining time, and optional history.

## Reference

- [Resolver API][resolver-api]
- [Countdown API][countdown-api]
- [Types and inference][types]

All durations are milliseconds. Examples with `fetch()` and DOM elements target browser applications; the core APIs are independent of a UI framework. Timing diagrams show intended scheduling, not real-time guarantees.

**Next:** [Get started][getting-started]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[getting-started]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/getting-started.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[countdown-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/countdown.md
[strategies]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/strategies.md
[ui]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/recipes/ui.md
[callbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/callbacks.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
[settlement]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/settlement.md
[countdown]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/countdown/lifecycle.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
