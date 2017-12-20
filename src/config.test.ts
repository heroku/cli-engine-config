import { defaultConfig, buildConfig } from './config'
import * as os from 'os'
import * as path from 'path'
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

  describe('aliases', () => {
    test('has default aliases', () => {
      let config = configFromPJSON()
      expect(config.aliases).toEqual({
        version: ['-v', '--version'],
        'plugins:uninstall': ['plugins:unlink'],
      })
    })

    test('can set aliases', () => {
      let config = configFromPJSON({
        'cli-engine': {
          aliases: {
            'foo:bar': 'baz',
          },
        },
      })
      expect(config.aliases['foo:bar']).toEqual(['baz'])
      expect(config.aliases['version']).toEqual(['-v', '--version'])
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
  describe('updateDisabled', () => {
    test('defaults to undefined', () => {
      let config = buildConfig()
      expect(config.updateDisabled).toEqual(undefined)
    })
    test('CLI_ENGINE_SKIP_CORE_UPDATES', () => {
      process.env.CLI_ENGINE_SKIP_CORE_UPDATES = '1'
      let config = buildConfig()
      expect(config.updateDisabled).toEqual('CLI_ENGINE_SKIP_CORE_UPDATES is set to 1')
    })
  })
})

describe('errlog', () => {
  test('set for windows', () => {
    let config = buildConfig({ platform: 'linux' })
    expect(config.errlog).toEqual(path.join(config.cacheDir, 'error.log'))
  })
})
