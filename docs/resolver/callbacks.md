# Callbacks and errors

[Home][home] · [Documentation][docs] · [Options reference][types]

Callbacks belong to one waiting call. They do not change the value or reason retained by the shared resolver.

## Transform successful values

`success(value, source)` receives a normal, manual, or fallback value. Its returned value becomes the call's result; returned promises are awaited.

```ts
import { Resolver } from 'promise-cycle';

const resolver = new Resolver(42);
const formatted = await resolver.immediate<string>({
  success: value => `Total: ${value}`,
});
console.log(formatted); // 'Total: 42'
console.log(await resolver.waiting); // 42
```

Without `success`, the selected value is returned directly. When you specify a different success result type, TypeScript requires the callback.

## Observe or recover from rejection

`error(reason, source)` runs for source/manual rejection. By default, the original reason is thrown after the callback completes.

```ts
import { Resolver } from 'promise-cycle';

await Resolver.reject(new Error('Unavailable')).immediate({
  error: reason => console.log(reason.message),
}).catch(reason => console.log('Still rejected:', reason));
```

Set `throw: false` to fulfill with the error callback result instead:

```ts
import { Resolver } from 'promise-cycle';

const message = await Resolver.reject(new Error('Unavailable')).minimum(100, {
  throw: false,
  error: reason => reason.message,
});
console.log(message); // 'Unavailable'
```

With no error callback, `throw: false` returns `undefined` on rejection.

## Failures inside your callbacks

| Failure | Result |
| --- | --- |
| Source promise rejects or `resolver.reject()` is called | Runs `error`, then applies `throw` |
| `success` throws or returns a rejected promise | Rejects the call; does not run `error` |
| `error` throws or returns a rejected promise | Rejects the call with that callback failure |
| Fallback factory throws | Rejects the call; does not run `error` |

`throw: false` does not suppress callback or fallback-factory failures. Catch those on the returned promise or around `await`.

## Reason types

`Reason` defaults to `unknown`. Narrow unknown errors before accessing their properties. A declared `Reason` type is a TypeScript contract, not runtime validation. Native promise rejection types are not inferred from `Promise<T>`.

```ts
import { Resolver } from 'promise-cycle';

await Resolver.immediate(Promise.reject('offline'), {
  throw: false,
  error: reason => reason instanceof Error ? reason.message : String(reason),
});
```

`Resolver.reject(reason)` infers `Reason` from its argument. Native `.catch()` does not preserve that generic; the resolver's `error` callback does.

**Next:** [Fallbacks][fallbacks] · [Types and inference][types]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
[fallbacks]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/fallbacks.md
