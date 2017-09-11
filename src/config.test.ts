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
  expect(config.updateHost).toEqual(undefined)
  expect(config.windows).toEqual(os.platform() === 'win32')
  expect(config.userPlugins).toEqual(false)
})

describe('windows', () => {
  test('windows', () => {
    let config = buildConfig({ platform: 'windows' })
    expect(config.platform).toEqual('windows')
    expect(config.windows).toEqual(true)
  })

  test('other', () => {
    let config = buildConfig({ platform: 'other' })
    expect(config.platform).toEqual('other')
    expect(config.windows).toEqual(false)
  })
})

describe('shell property', () => {
  it('is set dynamically when running windows', () => {
    process.env['COMSPEC'] = 'C:\\ProgramFiles\\cmd.exe'
    let config = buildConfig({ platform: 'windows' })
    expect(config.shell).toEqual('cmd.exe')
    delete process.env.COMSPEC
  })

  it('is set dynamically when running cywin', () => {
    process.env['SHELL'] = '/bin/bash'
    let config = buildConfig({ platform: 'windows' })
    expect(config.shell).toEqual('bash')
  })

  it('is set dynamically when running unix-like', () => {
    process.env['SHELL'] = `/usr/bin/fish`
    let config = buildConfig({ platform: 'darwin' })
    expect(config.shell).toEqual('fish')
  })
})

test('sets version from options', () => {
  const config = buildConfig({ version: '1.0.0-foobar' })
  expect(config.version).toEqual('1.0.0-foobar')
})

test('sets debug value', () => {
  process.env['CLI_ENGINE_DEBUG'] = '1'
  let config = buildConfig()
  expect(config.debug).toBe(1)
})

test('sets debug value if DEBUG=*', () => {
  process.env['DEBUG'] = '*,-babel'
  let config = buildConfig()
  expect(config.debug).toBe(1)
})

describe('with mockUserConfig', () => {
  let config
  function withUserConfig(userConfig) {
    const files = {}
    if (userConfig) files['config.json'] = JSON.stringify(userConfig)
    mockFS({ '/tmp/.config/cli-engine': files })
    config = buildConfig({ home: '/tmp' })
  }

  afterEach(() => {
    mockFS.restore()
  })

  test('loads the user config when present', () => {
    withUserConfig({ skipAnalytics: true })
    expect(config.skipAnalytics).toBe(true)
  })

  describe('skipAnalytics', () => {
    it('returns true when testing environment is set to "1" or "true"', () => {
      withUserConfig({ skipAnalytics: false })
      process.env['TESTING'] = '1'
      expect(config.skipAnalytics).toBeTruthy()
      process.env['TESTING'] = 'true'
      expect(config.skipAnalytics).toBeTruthy()
    })

    it('returns true when HEROKU_SKIP_TESTING is set', () => {
      withUserConfig({ skipAnalytics: false })
      process.env['CLI_ENGINE_SKIP_ANALYTICS'] = '1'
      expect(config.skipAnalytics).toBeTruthy()
    })

    it('returns true when the UserConfig specifies to skip analytics', () => {
      withUserConfig({ skipAnalytics: true })
      expect(config.skipAnalytics).toBeTruthy()
    })
  })

  describe('install', () => {
    it('when file does not have an install one is generated', () => {
      require('uuid/v4')
      withUserConfig({ skipAnalytics: false })
      expect(config.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.readJSONSync('/tmp/.config/cli-engine/config.json')).toEqual({
        skipAnalytics: false,
        install: config.install,
      })
    })

    it('when file does have an install one is not generated', () => {
      withUserConfig({ skipAnalytics: false, install: '1234' })
      expect(config.install).toEqual('1234')
      expect(fs.readJSONSync('/tmp/.config/cli-engine/config.json')).toEqual({
        skipAnalytics: false,
        install: '1234',
      })
    })

    it('does not define skipAnalytics if not defined', () => {
      withUserConfig({})
      expect(config.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.readJSONSync('/tmp/.config/cli-engine/config.json')).toEqual({
        install: config.install,
      })
    })

    it('does not define skipAnalytics if no file', () => {
      withUserConfig(null)
      expect(config.install).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(fs.readJSONSync('/tmp/.config/cli-engine/config.json')).toEqual({
        install: config.install,
      })
    })

    it('install is not defined if skipAnalytics is true', () => {
      withUserConfig({ skipAnalytics: true })
      expect(config.install).toBeUndefined()
      expect(fs.readJSONSync('/tmp/.config/cli-engine/config.json')).toEqual({
        skipAnalytics: true,
      })
    })

    it('install is not defined if skipAnalytics is true and install is set', () => {
      withUserConfig({ skipAnalytics: true, install: '1234' })
      expect(config.install).toBeUndefined()
      expect(fs.readJSONSync('/tmp/.config/cli-engine/config.json')).toEqual({
        skipAnalytics: true,
        install: '1234',
      })
    })
  })
})

describe('pjson', () => {
  let configFromPJSON = pjson => {
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
    expect(configFromPJSON(null)).toMatchObject({
      name: 'analytics',
      version: '1.0.0',
      dirname: 'heroku',
      commandsDir: path.join('/tmp/my-cli', 'lib/commands'),
      updateHost: 'mys3host',
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
      let config = configFromPJSON(undefined)
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
})
