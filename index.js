'use strict'

const EventEmitter = require('events').EventEmitter
const singleMetric = require('@telemetry-js/metric').single
const summaryMetric = require('@telemetry-js/metric').summary
const verifyPluginArguments = require('./lib/verify-plugin-args')
const createReducePlugin = require('./lib/reduce-plugin')

// TODO: move to lib/
exports.single = function (name, metricOptions) {
  verifyPluginArguments(name, metricOptions)

  const queues = []
  const pluginFn = function () {
    const queue = []
    queues.push(queue)
    return new IncidentalSingleCollector(queue)
  }

  pluginFn.record = function (value, date) {
    date = date || new Date()

    for (const queue of queues) {
      const metric = singleMetric(name, metricOptions)
      metric.record(value, date)
      queue.push(metric)
    }
  }

  return pluginFn
}

// TODO: move to lib/
exports.summary = function (name, metricOptions) {
  verifyPluginArguments(name, metricOptions)

  const summaries = new Map()
  let seq = 0

  const pluginFn = function () {
    const id = ++seq
    const get = summaries.get.bind(summaries, id)
    const reset = () => { summaries.set(id, summaryMetric(name, metricOptions)) }

    reset()
    return new IncidentalSummaryCollector(get, reset)
  }

  pluginFn.record = function (value, date) {
    date = date || new Date()

    for (const summary of summaries.values()) {
      summary.record(value, date)
    }
  }

  return pluginFn
}

exports.min = function (name, metricOptions) {
  return createReducePlugin(name, metricOptions, {
    statistic: 'min',
    initialValue: Number.POSITIVE_INFINITY,
    reduce: (a, b) => Math.min(a, b)
  })
}

exports.max = function (name, metricOptions) {
  return createReducePlugin(name, metricOptions, {
    statistic: 'max',
    initialValue: Number.NEGATIVE_INFINITY,
    reduce: (a, b) => Math.max(a, b)
  })
}

exports.sum = function (name, metricOptions) {
  return createReducePlugin(name, metricOptions, {
    statistic: 'sum',
    initialValue: 0,
    reduce: (a, b) => a + b
  })
}

// TODO (later): this collector should emit a metric with value 0 when no
// measurements have been made.
exports.count = function (name, metricOptions) {
  metricOptions = Object.assign({ unit: 'count' }, metricOptions)

  return createReducePlugin(name, metricOptions, {
    statistic: 'count',
    initialValue: 0,
    reduce: (a, b, count) => count
  })
}

// TODO: move to lib/
class IncidentalSingleCollector extends EventEmitter {
  constructor (queue) {
    super()
    this._queue = queue
  }

  start (callback) {
    this._queue.length = 0
    process.nextTick(callback)
  }

  ping (callback) {
    this._flush()

    // No need to dezalgo ping()
    callback()
  }

  stop (callback) {
    this._flush()
    process.nextTick(callback)
  }

  _flush () {
    for (const metric of this._queue) {
      this.emit('metric', metric)
    }

    this._queue.length = 0
  }
}

// TODO: move to lib/
class IncidentalSummaryCollector extends EventEmitter {
  constructor (get, reset) {
    super()
    this._get = get
    this._reset = reset
  }

  start (callback) {
    this._reset()
    process.nextTick(callback)
  }

  ping (callback) {
    this._flush()

    // No need to dezalgo ping()
    process.nextTick(callback)
  }

  stop (callback) {
    this._flush()
    process.nextTick(callback)
  }

  _flush () {
    const metric = this._get()
    this._reset()

    if (metric.stats.count > 0) {
      metric.touch()
      this.emit('metric', metric)
    }
  }
}
