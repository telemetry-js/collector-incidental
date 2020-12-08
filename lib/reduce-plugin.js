'use strict'

const verifyPluginArguments = require('./verify-plugin-args')
const ReduceCollector = require('./reduce-collector')

module.exports = function createReducePlugin (name, metricOptions, factoryOptions) {
  verifyPluginArguments(name, metricOptions)

  const instances = []

  // TODO (later): support plugin options? E.g. for adding tags on a per-task basis.
  const pluginFn = function (/* pluginOptions */) {
    const instance = new ReduceCollector(name, metricOptions, factoryOptions)
    instances.push(instance)
    return instance
  }

  pluginFn.record = function (value) {
    for (const instance of instances) {
      instance.record(value)
    }
  }

  return pluginFn
}
