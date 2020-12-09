# collector-incidental

> **Record incidental values (rather than on a fixed schedule). Meant to be combined with other plugins in a continuous Telemetry Task; if you merely want to publish metrics once, instead use a publisher plugin by itself.**  
> A [`telemetry`](https://github.com/telemetry-js/telemetry) plugin.

[![npm status](http://img.shields.io/npm/v/@telemetry-js/collector-incidental.svg)](https://www.npmjs.org/package/@telemetry-js/collector-incidental)
[![node](https://img.shields.io/node/v/@telemetry-js/collector-incidental.svg)](https://www.npmjs.org/package/@telemetry-js/collector-incidental)
[![Test](https://github.com/telemetry-js/collector-incidental/workflows/Test/badge.svg?branch=main)](https://github.com/telemetry-js/collector-incidental/actions)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Table of Contents

<details><summary>Click to expand</summary>

- [Usage](#usage)
  - [Summarize](#summarize)
  - [Reduce](#reduce)
- [API](#api)
  - [`plugin = incidental.single(metricName, options)`](#plugin--incidentalsinglemetricname-options)
  - [`plugin = incidental.summary(metricName, options)`](#plugin--incidentalsummarymetricname-options)
  - [`plugin = incidental.min(metricName, options)`](#plugin--incidentalminmetricname-options)
  - [`plugin = incidental.max(metricName, options)`](#plugin--incidentalmaxmetricname-options)
  - [`plugin = incidental.sum(metricName, options)`](#plugin--incidentalsummetricname-options)
  - [`plugin = incidental.count(metricName, options)`](#plugin--incidentalcountmetricname-options)
  - [`plugin`](#plugin)
  - [`plugin.record(value)`](#pluginrecordvalue)
- [Install](#install)
- [Acknowledgements](#acknowledgements)
- [License](#license)

</details>

## Usage

```js
const telemetry = require('@telemetry-js/telemetry')()
const incidental = require('@telemetry-js/collector-incidental')
const myCount = incidental.single('my.count', { unit: 'count' })

telemetry.task()
  .collect(myCount)
  .schedule(..)
  .publish(..)

// Elsewhere in your app
myCount.record(1000)
myCount.record(500)
```

This will publish every recorded value (use sparingly). You will also need a schedule plugin, otherwise the metrics stay queued in `collector-incidental` and will never be published.

### Summarize

If you're calling `record` many times within short time periods, either consider using the `rate` variant of the [`collector-counter`](https://github.com/telemetry-js/collector-counter) plugin, if it is a rate metric you need, or use `incidental.summary()`:

```js
const myCount = incidental.summary('my.count', { unit: 'count' })

telemetry.task()
  .collect(myCount)
  .schedule(..)
  .publish(..)

// Usage is the same
myCount.record(1000)
myCount.record(500)
```

This will publish one summary at every ping, summarizing the values you recorded between two pings. Pings typically happen every 5 minutes but it depends on your configured schedule.

### Reduce

Instead of the summary collector (which collects min, max, sum ánd count), you can also use a "reducer", one of `min`, `max`, `sum` or `count`. Taking `max` as an example:

```js
const myCount = incidental.max('my.count.max', { unit: 'count' })

telemetry.task()
  .collect(myCount)
  .schedule(..)
  .publish(..)

// Usage is the same
myCount.record(1000)
myCount.record(500)
```

This will publish one single value at every ping, reducing the values you recorded between two pings. Here, the first ping will lead to a metric being emitted with value 1000 (the maximum of 500 and 1000). Note that the internal state of the maximum value resets after a ping.

The emitted metrics get a relevant `.statistic` property which publishers like [`publisher-appoptics`](https://github.com/telemetry-js/publisher-appoptics) use to control server-side rollup behavior (when it's aggregating values into a lower resolution a.k.a. higher interval).

## API

### `plugin = incidental.single(metricName, options)`

Emits every value recorded between pings. It is recommended to end the metric name with the unit, e.g. `batch_size.count`, `size.bytes`.

Options:

- `unit`: string, required
- Other options are passed as-is to [`metric`](https://github.com/telemetry-js/metric).

### `plugin = incidental.summary(metricName, options)`

Emits a summary of values recorded between pings. Same arguments as `incidental.single()`.

### `plugin = incidental.min(metricName, options)`

Emits the minimum of values recorded between pings. Same arguments as `incidental.single()`.

### `plugin = incidental.max(metricName, options)`

Emits the maximum of values recorded between pings. Same arguments as `incidental.single()`.

### `plugin = incidental.sum(metricName, options)`

Emits the sum of values recorded between pings. Same arguments as `incidental.single()`.

### `plugin = incidental.count(metricName, options)`

Emits the count of values recorded between pings. Same arguments as `incidental.single()`, except that the `unit` option defaults to `'count'` and does not need to be specified.

Known issue: if no values were recorded, it should emit a metric with value 0 (in order to differentiate that situation from missing metrics) but it doesn't.

### `plugin`

This is a function to be passed to a Telemetry Task. Can be used by multiple tasks, sharing state:

```js
telemetry.task().collect(plugin)
telemetry.task().collect(plugin)
```

### `plugin.record(value)`

Record a value (as well as the current time when using `single`; summaries and reducers use ping time). Value must be a number.

## Install

With [npm](https://npmjs.org) do:

```
npm install @telemetry-js/collector-incidental
```

## Acknowledgements

This project is kindly sponsored by [Reason Cybersecurity Ltd](https://reasonsecurity.com).

[![reason logo](https://cdn.reasonsecurity.com/github-assets/reason_signature_logo.png)](https://reasonsecurity.com)

## License

[MIT](LICENSE) © Vincent Weevers
