// @flow

import { configFromRoot, buildConfig } from './config'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import mockFS from 'mock-fs'

const env = process.env

beforeEach(() => {
  process.env = {}
})

afterEach(() => {
  process.env = env
})

test('default props are set', () => {
  let config = buildConfig()
  expect(config.name).toEqual('cli-engine')
  expect(config.dirname).toEqual('cli-engine')
  expect(config.version).toEqual('0.0.0')
  expect(config.userAgent).toEqual(`cli-engine/0.0.0 (${config.platform}-${config.arch}) node-${process.version}`)
  expect(config.channel).toEqual('stable')
  expect(config.updateDisabled).toBeUndefined()
  expect(config.bin).toEqual('cli-engine')
  expect(config.root).toEqual(path.join(__dirname, '..'))
  expect(config.defaultCommand).toEqual('help')
  expect(config.pjson['cli-engine'].s3).toEqual({host: 'heroku-cli-assets'})
  expect(config.windows).toEqual(os.platform() === 'win32')
})

describe('windows', () => {
  let originalFunc
  beforeAll(() => {
    originalFunc = os.platform
  })

  afterEach(() => {
    os.platform = originalFunc
  })

  test('win32', () => {
    os.platform = jest.fn(() => 'win32')
    let config = buildConfig()
    expect(config.platform).toEqual('windows')
    expect(config.windows).toEqual(true)
  })

  test('windows', () => {
    os.platform = jest.fn(() => 'win32')
    let config = buildConfig()
    expect(config.platform).toEqual('windows')
    expect(config.windows).toEqual(true)
  })

  test('other', () => {
    os.platform = jest.fn(() => 'other')
    let config = buildConfig()
    expect(config.platform).toEqual('other')
    expect(config.windows).toEqual(false)
  })
})

describe('shell property', () => {
  let originalFunc

  beforeAll(() => {
    originalFunc = os.platform
  })

  afterEach(() => {
    os.platform = originalFunc
  })

  it('is set dynamically when running windows', () => {
    os.platform = jest.fn(() => { return 'win32' })
    process.env['COMSPEC'] = 'C:\\ProgramFiles\\cmd.exe'
    let config = buildConfig()
    expect(config.shell).toEqual('cmd.exe')
    delete process.env.COMSPEC
  })

  it('is set dynamically when running cywin', () => {
    os.platform = jest.fn(() => { return 'win32' })
    process.env['SHELL'] = '/bin/bash'
    const config = buildConfig()
    expect(config.shell).toEqual('bash')
  })

  it('is set dynamically when running unix-like', () => {
    os.platform = jest.fn(() => { return 'darwin' })
    process.env['SHELL'] = `/usr/bin/fish`
    const config = buildConfig()
    expect(config.shell).toEqual('fish')
  })
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

test('sets debug value', () => {
  process.env['CLI_ENGINE_DEBUG'] = '2'
  let sampleConfig = buildConfig()
  expect(sampleConfig.debug).toBe(2)
})

describe('with mockUserConfig', () => {
  let mockUserConfig
  const originalReadJSONSync = fs.readJSONSync

  beforeEach(() => {
    mockUserConfig = {'skipAnalytics': true}
    fs.readJSONSync = jest.fn(() => { return mockUserConfig })
  })
  afterEach(() => {
    fs.readJSONSync = originalReadJSONSync
  })

  test('loads the user config when present', () => {
    let sampleConfig = buildConfig()
    expect(sampleConfig.skipAnalytics).toBe(true)
  })

  describe('skipAnalytics', () => {
    it('returns true when testing environment is set to "1" or "true"', () => {
      mockUserConfig = {'skipAnalytics': false}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      process.env['TESTING'] = '1'
      let sampleConfig = buildConfig()
      expect(sampleConfig.skipAnalytics).toBeTruthy()
      process.env['TESTING'] = 'true'
      sampleConfig = buildConfig()
      expect(sampleConfig.skipAnalytics).toBeTruthy()
    })

    it('returns true when HEROKU_SKIP_TESTING is set', () => {
      mockUserConfig = {'skipAnalytics': false}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      process.env['CLI_ENGINE_SKIP_ANALYTICS'] = '1'
      let sampleConfig = buildConfig()
      expect(sampleConfig.skipAnalytics).toBeTruthy()
    })

    it('returns true when the UserConfig specificies to skip analytics', () => {
      let sampleConfig = buildConfig()
      expect(sampleConfig.skipAnalytics).toBeTruthy()
    })
  })

  describe('install', () => {
    it('when file does not have an install one is generated', () => {
      mockUserConfig = {'skipAnalytics': false}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({'skipAnalytics': false, install: sampleConfig.install})
    })

    it('when file does have an install one is not generated', () => {
      mockUserConfig = {'skipAnalytics': false, 'install': '1234'}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toEqual('1234')
      expect(fs.writeJSONSync.mock.calls).toEqual([])
    })

    it('does not define skipAnalytics if not defined', () => {
      mockUserConfig = {}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
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
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({install: sampleConfig.install, skipAnalytics: false})
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
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toMatchObject({install: sampleConfig.install})
    })

    it('install is not defined if file does exist but could not be written', () => {
      mockUserConfig = {}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      fs.writeJSONSync = jest.fn(() => {
        throw new Error()
      })
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({install: sampleConfig.install})
    })

    it('install is not defined if skipAnalytics is true', () => {
      mockUserConfig = {'skipAnalytics': true}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
    })

    it('install is not defined if skipAnalytics is true and install is set', () => {
      mockUserConfig = {'skipAnalytics': true, 'install': '1234'}
      fs.readJSONSync = jest.fn(() => { return mockUserConfig })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
    })
  })
})

describe('hooks', () => {
  test('is initialized', () => {
    const config = buildConfig()
    expect(config.hooks).toEqual({})
  })
  test('has hooks', () => {
    const config = buildConfig({
      pjson: {
        'cli-engine': {
          hooks: {
            prerun: './lib/hooks/prerun.js'
          }}}})
    expect(config.hooks.prerun).toEqual('./lib/hooks/prerun.js')
  })
})

describe('configFromRoot', () => {
  const pjson = {
    name: 'analytics',
    version: '1.0.0',
    'cli-engine': {
      dirname: 'heroku'
    }
  }

  let config
  beforeEach(() => {
    mockFS({
      '/tmp/my-cli': {
        'package.json': JSON.stringify(pjson)
      }
    })
    config = configFromRoot('/tmp/my-cli')
  })

  afterEach(() => {
    mockFS.restore()
  })

  test('reads the package.json', () => {
    expect(config).toMatchObject({
      name: 'analytics',
      dirname: 'heroku'
    })
  })
})
