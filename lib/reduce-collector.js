'use strict'

const EventEmitter = require('events').EventEmitter
const singleMetric = require('@telemetry-js/metric').single

module.exports = class ReduceCollector extends EventEmitter {
  constructor (name, metricOptions, factoryOptions) {
    super()

    const { statistic, initialValue, reduce } = factoryOptions

    this._name = name
    this._metricOptions = Object.assign({ statistic }, metricOptions)
    this._initialValue = initialValue
    this._reduce = reduce.bind(null)
    this._recording = false
    this._reset()
  }

  _reset () {
    this._count = 0
    this._value = 0
  }

  start (callback) {
    this._reset()
    this._recording = true

    process.nextTick(callback)
  }

  record (value) {
    if (this._recording === true) {
      const count = ++this._count
      const prev = count === 1 ? this._initialValue : this._value

      this._value = this._reduce(prev, value, count)
    }
  }

  ping (callback) {
    this._flush()

    // No need to dezalgo ping()
    callback()
  }

  stop (callback) {
    this._recording = false
    this._flush()
    process.nextTick(callback)
  }

  _flush () {
    if (this._count > 0) {
      const metric = singleMetric(this._name, this._metricOptions)
      metric.record(this._value)
      this._reset()
      this.emit('metric', metric)
    }
  }
}
