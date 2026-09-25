# Shared state and manual settlement

[Home][home] · [Documentation][docs] · [Resolver API][resolver-api]

## One outcome, many waits

A resolver settles once. The first source fulfillment, source rejection, manual `resolve()`, or manual `reject()` wins. Later settlement attempts are ignored.

```ts
import { Resolver } from 'promise-cycle';

const resolver = new Resolver<string>();
const first = resolver.immediate();
const second = resolver.minimum(100);

resolver.resolve('ready');
resolver.reject(new Error('Too late')); // Does not replace the value.

console.log(await Promise.all([first, second])); // ['ready', 'ready']
console.log(resolver.status, resolver.source); // 'fulfilled', 'manual'
```

Each wait has its own clock, callbacks, and fallback. Transformations affect only the calling promise. The shared `.waiting` promise exposes the original value or rejection without a presentation policy.

## Complete from a user action

An empty constructor creates a pending resolver. Supply generics to type future manual values and errors.

```ts
import { Resolver } from 'promise-cycle';

function waitForConfirmation(button: HTMLButtonElement): Promise<boolean> {
  const choice = new Resolver<boolean>();
  button.addEventListener('click', () => choice.resolve(true), { once: true });
  return choice.waiting;
}
```

Without explicit generics, an empty resolver's value type defaults to `any`; its reason type defaults to `unknown`.

Manual rejection follows the same callbacks and `throw` setting as a rejected source promise. It does not cancel the original request or remove your application event listeners.

## Read shared state

| Property or method | Result |
| --- | --- |
| `status` | `pending`, `fulfilled`, or `rejected` |
| `source` | `pending`, `normal`, or `manual` |
| `isPending()` | No shared outcome has been selected |
| `isFulfilled()` | The shared result is a value |
| `isRejected()` | The shared result is a rejection |
| `waiting` | Promise for the shared value; rejects with the shared reason |

A fallback or callback failure does not change shared state. Source promises settle asynchronously, so inspect state after awaiting when you need the settled result.

## Create from a value or reason

```ts
import { Resolver } from 'promise-cycle';

const value = Resolver.resolve(42);
const failure = Resolver.reject(new Error('Unavailable'));

console.log(await value.waiting);
await failure.immediate({ throw: false, error: reason => console.log(reason.message) });
```

These static methods create resolvers with source `normal`; they do not call the instance's manual settlement methods. `Resolver.resolve()` also adopts thenables. Both static constructors preserve function inputs as values/reasons without invoking them.

**Next:** [Countdown lifecycle][countdown] · [Types and inference][types]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[countdown]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/countdown/lifecycle.md
[types]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/types.md
