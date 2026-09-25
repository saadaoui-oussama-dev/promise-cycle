# UI timing recipes

[Home][home] · [Documentation][docs] · [Timing strategies][strategies]

## Avoid a flashing loading state

When a request returns quickly, a loading message can disappear almost as soon as it appears. `minimum()` lets the request run immediately while keeping the loading state visible for a deliberate period.

```ts
import { Resolver } from 'promise-cycle';

async function refresh(panel: HTMLElement) {
  panel.setAttribute('aria-busy', 'true');
  panel.textContent = 'Loading…';
  try {
    const operation = fetch('/api/message').then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
    const message = await Resolver.minimum(operation, 400);
    panel.textContent = message;
  } catch {
    panel.textContent = 'Please try again.';
  } finally {
    panel.setAttribute('aria-busy', 'false');
  }
}
```

Both success and failure wait for the minimum, preventing a fast error from flashing the loading state too. Choose a duration appropriate for your UI; the example's 400 ms is a product choice, not a library default.

## Coordinate with a repeating animation

For a loader with a 600 ms cycle, use `interval(600, 600)` to check at the end of each intended cycle. Start the animation and the waiting call together.

```ts
import { Resolver } from 'promise-cycle';

async function loadWithPulse(loader: HTMLElement, content: HTMLElement) {
  loader.hidden = false;
  const animation = loader.animate(
    [{ opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 }],
    { duration: 600, iterations: Infinity },
  );

  try {
    const operation = fetch('/api/message').then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
    const message = await Resolver.interval(operation, 600, 600);
    content.textContent = message;
  } catch {
    content.textContent = 'Could not load the message.';
  } finally {
    animation.cancel();
    loader.hidden = true;
  }
}
```

```text
600 ms cycles; result arrives at 850 ms

0 ms          600 ms       850 ms       1200 ms
|-------------|------------|------------|---->
^ start       ^ pending    ^ result     ^ reveal
  animation                  ready       content
```

This is timer-based coordination. Browser scheduling, background tabs, and animation start timing can shift the boundaries. For an exact animation endpoint, coordinate with the animation's own completion events or promises. `interval()` never inspects or controls an animation.

## Show cached text during a long request

```ts
import { Resolver } from 'promise-cycle';

async function loadMessage(cached: string): Promise<string> {
  const operation = fetch('/api/message').then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  });
  return Resolver.immediate(operation, {
    fallbackAfter: 1500,
    fallback: () => cached,
  });
}
```

A fallback handles waiting, not request errors. Rejection still follows the [error policy][callbacks]. Once a call returns cached text, it does not later update that value; use another wait on a shared resolver if you need the eventual result.

## Keep application ownership explicit

The library controls when a wait completes. It does not cancel requests, deduplicate separate resolver instances, or prevent older requests from updating a newer screen. Use your application's request cancellation or request-ID checks where needed.

**Next:** [Fallback details][fallbacks] · [Shared state][settlement]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[strategies]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/strategies.md
[callbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/callbacks.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
[settlement]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/settlement.md
