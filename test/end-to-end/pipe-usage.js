'use strict'

const t = require('tap')
const { spawn } = require('child_process')
const { promisify } = require('util')
const { MongoClient } = require('mongodb')
const { once } = require('events')

const mongoUrl = 'mongodb://one:two@localhost:27017/newdb?authSource=admin'
const setTimeout = promisify(global.setTimeout)

t.test('must log to a custom collection', async (t) => {
  const customCollection = 'custom-collection'
  const childProcess = spawn('node', [
    '../../pino-mongodb.js',
    mongoUrl,
    '-c',
    customCollection
  ], {
    cwd: __dirname,
    stdio: ['pipe', null, null]
  })

  const client = new MongoClient(mongoUrl)
  await client.connect()
  t.teardown(client.close.bind(client))
  const db = client.db()
  const collection = db.collection(customCollection)

  const rowsBefore = await collection.countDocuments()
  t.pass(`rows count ${rowsBefore}`)

  childProcess.stdin.write('hello pino-mongo 1\n')
  childProcess.stdin.write(`${JSON.stringify({ hello: 'pino' })}\n`)
  childProcess.stdin.write('hello pino-mongo 2\n')

  await setTimeout(5000)
  childProcess.kill('SIGINT')
  try {
    await once(childProcess, 'close')
    const rowsAfter = await collection.countDocuments()
    t.equal(rowsAfter, rowsBefore + 3, 'logged 3 rows')
  } catch (error) {
    t.error(error)
  }
})
