'use strict'

const test = require('tape')
const incidental = require('.')

test('single', async function (t) {
  t.plan(9)

  const single = incidental.single('test.count', { unit: 'count' })
  const collector = single()
  const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: undefined }
  const expect = (value, date) => Object.assign({}, common, { value }, date ? { date } : null)

  t.same(await collect(collector), [], 'no initial metrics')

  single.record(1)
  single.record(2)

  t.same(await collect(collector), [expect(1), expect(2)], 'can record')
  t.same(await collect(collector), [], 'queue resets after ping')

  single.record(5)
  single.record(5)

  t.same(await collect(collector), [expect(5), expect(5)], 'value can be recorded more than once')

  const customDate = new Date(1999, 1)
  single.record(100, customDate)
  t.same(await collect(collector, false, true), [expect(100, customDate)], 'can record with custom date')

  const collector2 = single()
  single.record(3)

  t.same(await collect(collector), [expect(3)], 'plugin can be tasked more than once')
  t.same(await collect(collector2), [expect(3)], 'plugin can be tasked more than once')
  t.same(await collect(collector), [], 'queue resets after ping')
  t.same(await collect(collector2), [], 'queue resets after ping')
})

test('single flushes on stop()', async function (t) {
  t.plan(1)

  const single = incidental.single('test.count', { unit: 'count' })
  const collector = single()
  const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: undefined }
  const expect = (value, date) => Object.assign({}, common, { value }, date ? { date } : null)

  single.record(1)
  single.record(2)

  t.same(await collect(collector, false, false, 'stop'), [expect(1), expect(2)])
})

test('summary', async function (t) {
  t.plan(9)

  const summary = incidental.summary('test.count', { unit: 'count' })
  const collector = summary()
  const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: undefined }
  const expect = (min, max, sum, count) => Object.assign({}, common, { stats: { sum, min, max, count } })

  t.same(await collect(collector), [], 'no initial metrics')

  summary.record(1)
  summary.record(2)

  t.same(await collect(collector), [expect(1, 2, 3, 2)], 'can record')
  t.same(await collect(collector), [], 'queue resets after ping')

  summary.record(5)
  summary.record(5)

  t.same(await collect(collector), [expect(5, 5, 10, 2)], 'value can be recorded more than once')

  const collector2 = summary()
  summary.record(3)

  t.same(await collect(collector), [expect(3, 3, 3, 1)], 'plugin can be tasked more than once')
  t.same(await collect(collector2), [expect(3, 3, 3, 1)], 'plugin can be tasked more than once')
  t.same(await collect(collector), [], 'queue resets after ping')
  t.same(await collect(collector2), [], 'queue resets after ping')

  const now = new Date()
  summary.record(10)
  await sleep(1000)
  const metric = (await collect(collector, false, true))[0]
  t.ok(metric.date > now, 'summary takes ping time')
})

test('summary flushes on stop()', async function (t) {
  t.plan(1)

  const summary = incidental.summary('test.count', { unit: 'count' })
  const collector = summary()
  const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: undefined }
  const expect = (min, max, sum, count) => Object.assign({}, common, { stats: { sum, min, max, count } })

  summary.record(1)
  summary.record(2)

  t.same(await collect(collector, false, false, 'stop'), [expect(1, 2, 3, 2)])
})

test('reducers', async function (t) {
  const types = {
    min: [2, 5, 3, 3],
    max: [4, 5, 3, 3],
    sum: [9, 10, 3, 3],
    count: [3, 2, 1, 1]
  }

  t.plan(Object.keys(types).length * 8)

  for (const type in types) {
    const expectedValues = types[type]
    const plugin = incidental[type]('test.count', { unit: 'count' })
    const collector = plugin()
    const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: type }
    const expect = () => Object.assign({}, common, { value: expectedValues.shift() })

    await start(collector)
    t.same(await collect(collector), [], `${type}: no initial metrics`)

    plugin.record(3)
    plugin.record(4)
    plugin.record(2)

    t.same(await collect(collector), [expect()], `${type}: can record`)
    t.same(await collect(collector), [], `${type}: reducer resets after ping`)

    plugin.record(5)
    plugin.record(5)

    t.same(await collect(collector), [expect()], `${type}: value can be recorded more than once`)

    const collector2 = plugin()
    await start(collector2)
    plugin.record(3)

    t.same(await collect(collector), [expect()], `${type}: plugin can be tasked more than once`)
    t.same(await collect(collector2), [expect()], `${type}: plugin can be tasked more than once`)
    t.same(await collect(collector), [], `${type}: reducer resets after ping`)
    t.same(await collect(collector2), [], `${type}: reducer resets after ping`)
  }
})

test('reducers flush on stop()', async function (t) {
  const types = {
    min: [2],
    max: [4],
    sum: [9],
    count: [3]
  }

  t.plan(Object.keys(types).length)

  for (const type in types) {
    const expectedValues = types[type]
    const plugin = incidental[type]('test.count', { unit: 'count' })
    const collector = plugin()
    const common = { name: 'test.count', unit: 'count', resolution: 60, statistic: type }
    const expect = () => Object.assign({}, common, { value: expectedValues.shift() })

    await start(collector)

    plugin.record(3)
    plugin.record(4)
    plugin.record(2)

    t.same(await collect(collector, false, false, 'stop'), [expect()], `${type}: flushes on stop`)
  }
})

function collect (collector, round, keepDate, method) {
  return new Promise((resolve, reject) => {
    const metrics = []

    collector.on('metric', metrics.push.bind(metrics))

    collector[method || 'ping']((err) => {
      if (err) return reject(err)

      metrics.forEach(simplify.bind(null, keepDate))
      if (round) metrics.forEach(roundValue)

      resolve(metrics)
    })
  })
}

function start (collector) {
  return new Promise((resolve, reject) => {
    collector.start((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

function simplify (keepDate, metric) {
  delete metric.tags
  if (!keepDate) delete metric.date

  return metric
}

function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function roundValue (metric) {
  metric.value = Math.round(metric.value)
}
