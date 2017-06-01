// @flow

import { buildConfig } from './config'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'

let mockUserConfig = {'skipAnalytics': true}
const originalReadJSONSync = fs.readJSONSync
beforeEach(() => {
  mockUserConfig = {'skipAnalytics': true}
  fs.readJSONSync = jest.fn(() => { return mockUserConfig })
})
afterEach(() => {
  fs.readJSONSync = originalReadJSONSync
})
let configOptions
beforeEach(() => {
  configOptions = {
    pjson: {
      name: 'analytics',
      version: '1.0.0',
      'cli-engine': {
        dirname: 'heroku'
      }
    },
    install: undefined
  }
})

test('default props are set', () => {
  const config = buildConfig()
  expect(config.name).toEqual('cli-engine')
  expect(config.dirname).toEqual('cli-engine')
  expect(config.version).toEqual('0.0.0')
  expect(config.userAgent).toEqual(`cli-engine/0.0.0 (${config.platform}-${config.arch}) node-${process.version}`)
  expect(config.channel).toEqual('stable')
  expect(config.updateDisabled).toBeUndefined()
  expect(config.bin).toEqual('cli-engine')
  expect(config.root).toEqual(path.join(__dirname, '..'))
  expect(config.defaultCommand).toEqual('help')
  expect(config.s3).toEqual({})
  expect(config.windows).toEqual(os.platform() === 'win32')
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

test('sets debug value', () => {
  process.env['CLI_ENGINE_DEBUG'] = '2'
  let sampleConfig = buildConfig(configOptions)
  expect(sampleConfig.debug).toBe(2)
})

describe('skipAnalytics', () => {
  it('returns true when testing environment is set to "1"', () => {
    mockUserConfig = { 'skipAnalytics': false }
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
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
  it('prefers the constructor argument over user config', () => {
    // flow$ignore
    configOptions.skipAnalytics = true
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.skipAnalytics).toBe(true)

    // flow$ignore
    configOptions.skipAnalytics = false
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.skipAnalytics).toBe(false)
  })
})

describe('install', () => {
  it('when file does not have an install one is generated', () => {
    mockUserConfig = { 'skipAnalytics': false }
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn()
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
    expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({'skipAnalytics': false, install: sampleConfig.install})
  })

  it('when file does have an install one is not generated', () => {
    mockUserConfig = { 'skipAnalytics': false, 'install': '1234' }
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn()
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toEqual('1234')
    expect(fs.writeJSONSync.mock.calls).toEqual([])
  })

  it('does not define skipAnalytics if not defined', () => {
    mockUserConfig = {}
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn()
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
    expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({install: sampleConfig.install})
  })

  it('does not define skipAnalytics if no file', () => {
    mockUserConfig = {}
    fs.readJSONSync = jest.fn(() => {
      let err = new Error()
      // flow$ignore
      err.code = 'ENOENT'
      throw err
    })
    fs.writeJSONSync = jest.fn()
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
    expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({install: sampleConfig.install})
  })

  it('install is not defined if file does not exist & could not be written', () => {
    mockUserConfig = {}
    fs.readJSONSync = jest.fn(() => {
      let err = new Error()
      // flow$ignore
      err.code = 'ENOENT'
      throw err
    })
    fs.writeJSONSync = jest.fn(() => {
      throw new Error()
    })
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toBeNull()
    expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
    expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({install: sampleConfig.install})
  })

  it('install is not defined if file does exist but could not be written', () => {
    mockUserConfig = {}
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn(() => {
      throw new Error()
    })
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toBeNull()
    expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
    expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({install: sampleConfig.install})
  })

  it('install is not defined if skipAnalytics is true', () => {
    mockUserConfig = { 'skipAnalytics': true }
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn()
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toBeNull()
    expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
  })

  it('install is not defined if skipAnalytics is true and install is set', () => {
    mockUserConfig = { 'skipAnalytics': true, 'install': '1234' }
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn()
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toBeNull()
    expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
  })

  it('passes through install in buildConfig', () => {
    mockUserConfig = { 'skipAnalytics': false }
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
    fs.writeJSONSync = jest.fn()
    configOptions.install = '1234'
    let sampleConfig = buildConfig(configOptions)
    expect(sampleConfig.install).toBe('1234')
    expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
  })
})
