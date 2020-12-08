'use strict'

module.exports = function verifyPluginArguments (name, metricOptions) {
  if (typeof name !== 'string' || name === '') {
    throw new TypeError('The first argument "name" must be a non-empty string')
  } else if (typeof metricOptions !== 'object' || metricOptions === null) {
    throw new TypeError('The second argument "options" must be an object')
  } else if (typeof metricOptions.unit !== 'string' || metricOptions.unit === '') {
    throw new TypeError('The required "unit" option must be a non-empty string')
  }
}
