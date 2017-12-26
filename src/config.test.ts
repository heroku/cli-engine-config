import * as path from 'path'

import { Config } from './config'

const env = process.env
jest.mock('os')
let platform: NodeJS.Platform = 'linux'
const os = require('os')

beforeEach(() => {
  process.env = {}
  os.platform = jest.fn().mockImplementation(() => platform)
  os.homedir = jest.fn().mockImplementation(() => '/Users/me')
  os.arch = jest.fn().mockImplementation(() => 'x64')
})

afterEach(() => {
  process.env = env
})

test('default props are set', () => {
  let config = new Config()
  expect(config._version).toEqual(require('../package.json').version)
  expect(config.arch).toEqual('x64')
  expect(config.argv).toEqual(process.argv)
  expect(config.bin).toEqual('cli-engine')
  expect(config.channel).toEqual('stable')
  expect(config.corePlugins).toEqual([])
  expect(config.debug).toEqual(0)
  expect(config.defaultCommand).toEqual(undefined)
  expect(config.dirname).toEqual('cli-engine')
  expect(config.hooks).toEqual({})
  expect(config.name).toEqual('cli-engine')
  expect(config.root).toEqual(undefined)
  expect(config.reexecBin).toEqual(undefined)
  expect(config.platform).toEqual('linux')
  expect(config.s3).toEqual({ host: undefined })
  expect(config.topics).toEqual({})
  expect(config.userPluginsEnabled).toEqual(false)

  expect(config.cacheDir).toEqual('/Users/me/.cache/cli-engine')
  expect(config.dataDir).toEqual('/Users/me/.local/share/cli-engine')
  expect(config.configDir).toEqual('/Users/me/.config/cli-engine')

  expect(config.home).toEqual('/Users/me')
  expect(config.updateDisabled).toBeUndefined()
  expect(config.userAgent).toEqual(`cli-engine/0.0.0 (linux-x64) node-${process.version}`)
  expect(config.version).toEqual('0.0.0')
  expect(config.windows).toEqual(false)
})

describe('windows', () => {
  test('win32', () => {
    platform = 'win32'
    let config = new Config()
    expect(config.platform).toEqual('win32')
    expect(config.windows).toEqual(true)
  })

  test('darwin', () => {
    platform = 'darwin'
    let config = new Config()
    expect(config.platform).toEqual('darwin')
    expect(config.windows).toEqual(false)
  })
})

describe('shell property', () => {
  it('is set dynamically when running windows', () => {
    platform = 'win32'
    process.env.COMSPEC = 'C:\\ProgramFiles\\cmd.exe'
    let config = new Config()
    expect(config.shell).toEqual('cmd.exe')
    delete process.env.COMSPEC
  })

  it('is set dynamically when running cywin', () => {
    platform = 'win32'
    process.env.SHELL = '/bin/bash'
    const config = new Config()
    expect(config.shell).toEqual('bash')
  })

  it('is set dynamically when running unix-like', () => {
    platform = 'darwin'
    process.env.SHELL = `/usr/bin/fish`
    const config = new Config()
    expect(config.shell).toEqual('fish')
  })

  it('defaults to unkown', () => {
    platform = 'darwin'
    const config = new Config()
    expect(config.shell).toEqual('unknown')
  })
})

test('sets version from options', () => {
  const config = new Config({ version: '1.0.0-foobar' })
  expect(config.version).toEqual('1.0.0-foobar')
})

test('sets debug value', () => {
  process.env.CLI_ENGINE_DEBUG = '1'
  let sampleConfig = new Config()
  expect(sampleConfig.debug).toBe(1)
})

describe('pjson', () => {
  let configFromPJSON = (pjson?: any) => {
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
    return new Config({ root: '/foo', pjson })
  }

  test('reads the package.json', () => {
    let config = configFromPJSON()
    expect(config.name).toEqual('analytics')
    expect(config.version).toEqual('1.0.0')
    expect(config.dirname).toEqual('heroku')
    expect(config.commandsDir).toEqual('/foo/lib/commands')
    expect(config.s3).toEqual({ host: 'mys3host' })
    expect(config.hooks).toEqual({})
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
  describe('topics', () => {
    test('defaults to undefined', () => {
      expect(configFromPJSON().topics).toEqual({})
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
      expect(config.topics.foo.description).toEqual('description for foo')
    })
  })
  describe('s3', () => {
    describe('host', () => {
      test('CLI_ENGINE_S3_HOST', () => {
        process.env.CLI_ENGINE_S3_HOST = 'https://bar'
        let config = new Config()
        expect(config.s3.host).toEqual('https://bar')
      })
    })
  })
  describe('npmRegistry', () => {
    test('defaults to yarn', () => {
      let config = new Config()
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
      let config = new Config()
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
    test('CLI_ENGINE_SKIP_CORE_UPDATES', () => {
      process.env.CLI_ENGINE_SKIP_CORE_UPDATES = '1'
      let config = new Config()
      expect(config.updateDisabled).toEqual('CLI_ENGINE_SKIP_CORE_UPDATES is set to 1')
    })
  })
  describe('reexecBin', () => {
    test('defaults to undefined', () => {
      let config = new Config()
      expect(config.reexecBin).toEqual(undefined)
    })
    test('CLI_ENGINE_CLI_BINPATH', () => {
      process.env.CLI_ENGINE_CLI_BINPATH = '/foo/bar/baz'
      let config = new Config()
      expect(config.reexecBin).toEqual('/foo/bar/baz')
    })
  })

  describe('home', () => {
    test('defaults to HOME even if USERPROFILE and HOMEDRIVE/HOMEPATH is set', () => {
      platform = 'win32'
      process.env.USERPROFILE = '/home/userprofile'
      process.env.HOMEDRIVE = '/homedrive/'
      process.env.HOMEPATH = '/home/homepath'
      process.env.HOME = '/home/home'
      let config = new Config()
      expect(config.home).toEqual('/home/home')
    })

    test('defaults to HOMEDRIVE/HOMEPATH even if USERPROIFLE set', () => {
      platform = 'win32'
      process.env.USERPROFILE = '/home/userprofile'
      process.env.HOMEDRIVE = '/homedrive/'
      process.env.HOMEPATH = '/home/homepath'
      let config = new Config()
      expect(config.home).toEqual('/homedrive/home/homepath')
    })

    test('defaults to USERPROIFLE', () => {
      platform = 'win32'
      process.env.USERPROFILE = '/home/userprofile'
      let config = new Config()
      expect(config.home).toEqual('/home/userprofile')
    })
  })
})

describe('errlog', () => {
  test('set for win32', () => {
    let config = new Config()
    expect(config.errlog).toEqual(path.join(config.cacheDir, 'error.log'))
  })
})

describe('dirs', () => {
  describe('cacheDir', () => {
    test('macos is special', () => {
      platform = 'darwin'
      expect(new Config().cacheDir).toEqual('/Users/me/Library/Caches/cli-engine')
    })
    test('linux', () => {
      platform = 'linux'
      expect(new Config().cacheDir).toEqual('/Users/me/.cache/cli-engine')
    })
    describe('win32', () => {
      beforeEach(() => (platform = 'win32'))
      test('normal', () => {
        expect(new Config().cacheDir).toEqual('/Users/me/.cache/cli-engine')
      })
      test('XDG_CACHE_HOME and LOCALAPPDATA', () => {
        process.env.XDG_CACHE_HOME = '/xdg/home/cache'
        process.env.LOCALAPPDATA = '/local/home/cache'
        expect(new Config().cacheDir).toEqual('/xdg/home/cache/cli-engine')
      })
      test('LOCALAPPDATA', () => {
        process.env.LOCALAPPDATA = '/local/home/cache'
        expect(new Config().cacheDir).toEqual('/local/home/cache/cli-engine')
      })
    })
  })
})

describe('memoize', () => {
  os.platform = jest
    .fn()
    .mockReturnValueOnce('win32')
    .mockReturnValueOnce('freebsd')
  const config = new Config()
  expect(config.platform).toEqual('win32')
  expect(config.platform).toEqual('win32')
})

describe('deprecated functionality', () => {
  const config = require('./config').buildConfig()
  expect(config.name).toEqual('cli-engine')
})
