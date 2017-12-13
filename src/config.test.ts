import { defaultConfig, buildConfig } from './config'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs-extra'
import * as mockFS from 'mock-fs'

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
  expect(config.pjson['cli-engine'].s3).toEqual({ host: null })
  expect(config.windows).toEqual(os.platform() === 'win32')
  expect(config.userPlugins).toEqual(false)
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
    os.platform = jest.fn(() => {
      return 'win32'
    })
    process.env['COMSPEC'] = 'C:\\ProgramFiles\\cmd.exe'
    let config = buildConfig()
    expect(config.shell).toEqual('cmd.exe')
    delete process.env.COMSPEC
  })

  it('is set dynamically when running cywin', () => {
    os.platform = jest.fn(() => {
      return 'win32'
    })
    process.env['SHELL'] = '/bin/bash'
    const config = buildConfig()
    expect(config.shell).toEqual('bash')
  })

  it('is set dynamically when running unix-like', () => {
    os.platform = jest.fn(() => {
      return 'darwin'
    })
    process.env['SHELL'] = `/usr/bin/fish`
    const config = buildConfig()
    expect(config.shell).toEqual('fish')
  })
})

test('sets version from options', () => {
  const config = buildConfig({ version: '1.0.0-foobar' })
  expect(config.version).toEqual('1.0.0-foobar')
})

test('sets debug value', () => {
  process.env['CLI_ENGINE_DEBUG'] = '1'
  let sampleConfig = buildConfig()
  expect(sampleConfig.debug).toBe(1)
})

describe('with mockUserConfig', () => {
  let mockUserConfig
  const originalReadJSONSync = fs.readJSONSync

  beforeEach(() => {
    mockUserConfig = { skipAnalytics: true }
    fs.readJSONSync = jest.fn(() => {
      return mockUserConfig
    })
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
      mockUserConfig = { skipAnalytics: false }
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      process.env['TESTING'] = '1'
      let sampleConfig = buildConfig()
      expect(sampleConfig.skipAnalytics).toBeTruthy()
      process.env['TESTING'] = 'true'
      sampleConfig = buildConfig()
      expect(sampleConfig.skipAnalytics).toBeTruthy()
    })

    it('returns true when HEROKU_SKIP_TESTING is set', () => {
      mockUserConfig = { skipAnalytics: false }
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
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
      mockUserConfig = { skipAnalytics: false }
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({ skipAnalytics: false, install: sampleConfig.install })
    })

    it('when file does have an install one is not generated', () => {
      mockUserConfig = { skipAnalytics: false, install: '1234' }
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toEqual('1234')
      expect(fs.writeJSONSync.mock.calls).toEqual([])
    })

    it('does not define skipAnalytics if not defined', () => {
      mockUserConfig = {}
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({ install: sampleConfig.install })
    })

    it('does not define skipAnalytics if no file', () => {
      mockUserConfig = {}
      fs.readJSONSync = jest.fn(() => {
        let err = new Error()
        err.code = 'ENOENT'
        throw err
      })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({ install: sampleConfig.install, skipAnalytics: false })
    })

    it('install is not defined if file does not exist & could not be written', () => {
      mockUserConfig = {}
      fs.readJSONSync = jest.fn(() => {
        let err = new Error()
        err.code = 'ENOENT'
        throw err
      })
      fs.writeJSONSync = jest.fn(() => {
        throw new Error()
      })
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toMatchObject({ install: sampleConfig.install })
    })

    it('install is not defined if file does exist but could not be written', () => {
      mockUserConfig = {}
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      fs.writeJSONSync = jest.fn(() => {
        throw new Error()
      })
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(1)
      expect(fs.writeJSONSync.mock.calls[0][1]).toEqual({ install: sampleConfig.install })
    })

    it('install is not defined if skipAnalytics is true', () => {
      mockUserConfig = { skipAnalytics: true }
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
    })

    it('install is not defined if skipAnalytics is true and install is set', () => {
      mockUserConfig = { skipAnalytics: true, install: '1234' }
      fs.readJSONSync = jest.fn(() => {
        return mockUserConfig
      })
      fs.writeJSONSync = jest.fn()
      let sampleConfig = buildConfig()
      expect(sampleConfig.install).toBeNull()
      expect(fs.writeJSONSync.mock.calls.length).toEqual(0)
    })
  })
})

describe('pjson', () => {
  let configFromPJSON = (pjson?: Object) => {
    pjson = pjson || {
      name: 'analytics',
      version: '1.0.0',
      'cli-engine': {
        dirname: 'heroku',
        commands: './lib/commands',
        s3: {
          host: 'mys3host',
        },
      },
    }
    mockFS({
      '/tmp/my-cli': {
        'package.json': JSON.stringify(pjson),
      },
    })
    return buildConfig({ root: '/tmp/my-cli' })
  }

  afterEach(() => {
    mockFS.restore()
  })

  test('reads the package.json', () => {
    expect(configFromPJSON()).toMatchObject({
      name: 'analytics',
      version: '1.0.0',
      dirname: 'heroku',
      commandsDir: path.join(path.sep, 'tmp', 'my-cli', 'lib', 'commands'),
      s3: { host: 'mys3host' },
      hooks: {},
    })
  })

  describe('hooks', () => {
    test('has hooks', () => {
      let config = configFromPJSON({
        'cli-engine': {
          hooks: {
            prerun: './lib/hooks/prerun.js',
          },
        },
      })
      expect(config.hooks.prerun).toEqual(['./lib/hooks/prerun.js'])
    })

    test('has multiple hooks', () => {
      let config = configFromPJSON({
        'cli-engine': {
          hooks: {
            init: ['./lib/hooks/a.js', './lib/hooks/b.js', './lib/hooks/c.js'],
          },
        },
      })
      expect(config.hooks.init).toEqual(['./lib/hooks/a.js', './lib/hooks/b.js', './lib/hooks/c.js'])
    })
  })

  describe('bin', () => {
    test('can be set', () => {
      let config = configFromPJSON({
        'cli-engine': { bin: 'heroku' },
      })
      expect(config.bin).toEqual('heroku')
    })
  })
  describe('dirname', () => {
    test('follows bin', () => {
      let config = configFromPJSON({
        'cli-engine': { bin: 'heroku' },
      })
      expect(config.dirname).toEqual('heroku')
    })
    test('can be set', () => {
      let config = configFromPJSON({
        'cli-engine': { dirname: 'mydirname', bin: 'heroku' },
      })
      expect(config.dirname).toEqual('mydirname')
    })
  })
  describe('legacyConverter', () => {
    test('defaults to undefined', () => {
      let config = configFromPJSON()
      expect(config.legacyConverter).toBeUndefined()
    })
    test('can be set', () => {
      let config = configFromPJSON({
        'cli-engine': { legacyConverter: 'foo' },
      })
      expect(config.legacyConverter).toEqual('foo')
    })
  })
  describe('topics', () => {
    test('defaults to undefined', () => {
      expect(defaultConfig.topics).toEqual({})
    })
    test('can be set', () => {
      let config = configFromPJSON({
        'cli-engine': {
          topics: {
            foo: {
              description: 'description for foo',
            },
            bar: {
              hidden: true,
            },
          },
        },
      })
      expect(config.topics).toMatchObject({
        foo: { name: 'foo', description: 'description for foo' },
        bar: { name: 'bar', hidden: true },
      })
    })
  })
  describe('s3', () => {
    describe('host', () => {
      test('CLI_ENGINE_S3_HOST', () => {
        process.env.CLI_ENGINE_S3_HOST = 'https://bar'
        let config = buildConfig()
        expect(config.s3.host).toEqual('https://bar')
      })
    })
  })
  describe('npmRegistry', () => {
    test('defaults to yarn', () => {
      let config = buildConfig()
      expect(config.npmRegistry).toEqual('https://registry.yarnpkg.com')
    })
    test('can be set', () => {
      let config = configFromPJSON({
        'cli-engine': {
          npmRegistry: 'https://foo',
        },
      })
      expect(config.npmRegistry).toEqual('https://foo')
    })
    test('uses env var', () => {
      process.env.CLI_ENGINE_NPM_REGISTRY = 'https://bar'
      let config = buildConfig()
      expect(config.npmRegistry).toEqual('https://bar')
    })
    test('env var overrides default', () => {
      process.env.CLI_ENGINE_NPM_REGISTRY = 'https://bar'
      let config = configFromPJSON({
        'cli-engine': {
          npmRegistry: 'https://foo',
        },
      })
      expect(config.npmRegistry).toEqual('https://bar')
    })
  })
  describe('skipCoreUpdates', () => {
    test('defaults to false', () => {
      let config = buildConfig()
      expect(config.skipCoreUpdates).toEqual(false)
    })
    test('CLI_ENGINE_SKIP_CORE_UPDATES', () => {
      process.env.CLI_ENGINE_SKIP_CORE_UPDATES = '1'
      let config = buildConfig()
      expect(config.skipCoreUpdates).toEqual(true)
    })
  })
})

describe('errlog', () => {
  test('set for windows', () => {
    let config = buildConfig({ platform: 'linux' })
    expect(config.errlog).toEqual(path.join(config.cacheDir, 'error.log'))
  })
})
