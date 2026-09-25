# Fallbacks

[Home][home] · [Documentation][docs] · [Options reference][types]

A fallback gives one waiting call a replacement value when the shared operation is still pending after a specified duration.

## Value or factory

```ts
import { Resolver } from 'promise-cycle';

const resolver = new Resolver<string>();
const displayed = await resolver.immediate({
  fallbackAfter: 100,
  fallback: () => 'Still working…',
  success: (value, source) => {
    console.log(source); // 'fallback'
    return value;
  },
});

resolver.resolve('Ready');
console.log(displayed); // 'Still working…'
console.log(await resolver.waiting); // 'Ready'
```

A factory runs lazily, once for that call, only if the fallback is selected. Factories must return synchronously. For a function-valued fallback, wrap the function: `fallback: () => yourFunction`.

The fallback must match the resolver's value type. For `fetch()`, parse the response into the application value before passing it to a resolver if you want a data-shaped fallback.

## Required and optional fallback values

Providing `fallbackAfter` requires `fallback` unless the `Value` type accepts `undefined`:

```ts
import { Resolver } from 'promise-cycle';

const optional = new Resolver<string | undefined>();
const value = await optional.immediate({ fallbackAfter: 100 });
console.log(value); // undefined
```

A fallback without `fallbackAfter` is not accepted by the options type. Omitting the duration, or passing zero or an invalid duration, disables its timer. Even `fallbackAfter: 0` still follows the type-level requirement for a fallback value.

## What the timer controls

The timer starts when the waiting method is called. If it expires while the resolver is pending, its value bypasses any minimum or interval hold. If the resolver has already settled, the fallback is not selected, even if the call is still waiting for a timing boundary.

The fallback takes the success path, including with `throw: true`. It does not trigger `error`. A thrown fallback-factory exception rejects the call.

Fallbacks do not settle the shared resolver, cancel the underlying operation, change `status` or `source`, or bound callback execution time. Other calls can still receive the eventual source/manual result.

## Identify the value's origin

| Callback source | Meaning |
| --- | --- |
| `normal` | The supplied promise or value fulfilled |
| `manual` | `resolver.resolve(value)` settled the shared resolver |
| `fallback` | This call selected its replacement value |

The success callback reports the per-call origin. The resolver's `.source` reports only shared settlement and never becomes `fallback`.

**Next:** [Shared state and manual settlement][settlement]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
[settlement]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/settlement.md
