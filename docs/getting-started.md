# Getting started

[Home][home] · [Documentation][docs] · [API][resolver-api]

## Install

```sh
npm install promise-cycle
```

```ts
import { Resolver, Countdown } from 'promise-cycle';
import type { Types } from 'promise-cycle';
```

CommonJS is also supported:

```js
const { Resolver, Countdown } = require('promise-cycle');
```

## Wait with a timing policy

Use a static strategy for a single wait:

```ts
import { Resolver } from 'promise-cycle';

const message = await Resolver.minimum(
  fetch('/api/message').then(response => response.text()),
  400,
);
console.log(message);
```

The operation begins when you call `fetch()`. The minimum starts when you call `minimum()`. Include response parsing in the supplied promise when the UI needs parsed data before delivery.

Use an instance when several callers share the result:

```ts
import { Resolver } from 'promise-cycle';

const resolver = new Resolver(Promise.resolve('ready'));
const fast = resolver.immediate();
const presented = resolver.minimum(400);
console.log(await fast, await presented);
```

## Inputs and outputs

The constructor and static strategies accept promises and plain values. A function input is a value: it is not invoked. Call your operation yourself and pass its returned promise.

```ts
import { Resolver } from 'promise-cycle';

const value = await new Resolver(42).waiting;
const fromStatic = await Resolver.resolve(42).immediate();
const manual = new Resolver<string>();
manual.resolve('ready');
console.log(value, fromStatic, await manual.waiting);
```

`Resolver.resolve()` and `Resolver.reject()` return resolver instances. Waiting methods and `.waiting` return promises. An empty constructor stays pending for manual settlement; explicitly passing `undefined` fulfills normally.

## A simple countdown

```ts
import { Countdown } from 'promise-cycle';

await Countdown.sleep(100);
const counter = new Countdown(500);
counter.stop();
console.log(counter.remaining); // Saved time, unchanged while stopped.
await counter.resume();
```

**Next:** [Choose a strategy][strategies] · [Countdown lifecycle][countdown]

[home]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/README.md
[docs]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/README.md
[resolver-api]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/api/resolver.md
[strategies]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/resolver/strategies.md
[countdown]: https://github.com/saadaoui-oussama-dev/promise-cycle/blob/main/docs/countdown/lifecycle.md
