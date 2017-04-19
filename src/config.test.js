// @flow

import { buildConfig } from './config'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'

let mockUserConfig = { 'skipAnalytics': true }
const originalReadJsonSync = fs.readJsonSync
beforeEach(() => {
  mockUserConfig = { 'skipAnalytics': true }
  fs.readJsonSync = jest.fn(() => { return mockUserConfig })
})
afterEach(() => {
  fs.readJsonSync = originalReadJsonSync
})
let configOptions
beforeAll(() => {
  configOptions = {
    pjson: {
      name: 'analytics',
      version: '1.0.0',
      'cli-engine': {
        dirname: 'heroku'
      }
    }
  }
})

test('default props are set', () => {
  const config = buildConfig()
  expect(config.name).toEqual('cli-engine')
  expect(config.dirname).toEqual('cli-engine')
  expect(config.version).toEqual('0.0.0')
  expect(config.channel).toEqual('stable')
  expect(config.updateDisabled).toBeUndefined()
  expect(config.bin).toEqual('cli-engine')
  expect(config.root).toEqual(path.join(__dirname, '..'))
  expect(config.defaultCommand).toEqual('help')
  expect(config.s3).toEqual({})
  expect(config.windows).toEqual(os.platform === 'win32')
})

test('reads pjson values', () => {
  const config = buildConfig({
    pjson: {
      name: 'mycli',
      version: '1.0.0',
      'cli-engine': {
        dirname: 'heroku'
      }
    }
  })
  expect(config.name).toEqual('mycli')
  expect(config.version).toEqual('1.0.0')
  expect(config.dirname).toEqual('heroku')
})

test('sets version from options', () => {
  const config = buildConfig({version: '1.0.0-foobar'})
  expect(config.version).toEqual('1.0.0-foobar')
})

test('loads the user config when present', () => {
  let sampleConfig = buildConfig(configOptions)
  expect(sampleConfig.skipAnalytics).toBe(true)
})

describe('skipAnalytics', () => {
  it('returns true when testing environment is set to "1"', () => {
    mockUserConfig = '{ "skipAnalytics": false }'
    fs.readJsonSync = jest.fn(() => { return mockUserConfig })
    process.env['TESTING'] = '1'
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.skipAnalytics).toBeTruthy()
    process.env['TESTING'] = 'true'
    sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.skipAnalytics).not.toBeTruthy()
  })
  it('returns true when the UserConfig specificies to skip analytics', () => {
    delete process.env.TESTING
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.skipAnalytics).toBeTruthy()
  })
})
