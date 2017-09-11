import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'
import { IArg, Flag, ValueFlag } from 'cli-flags'
import 'core-js/library'

export type Topic = {
  name: string
  description?: string
  hidden?: boolean
}

export type UserConfig = {
  skipAnalytics?: boolean
  install?: string
}

export type CLI = {
  bin?: string
  dirname?: string
  defaultCommand?: string
  commands?: string
  s3?: { host?: string }
  updateHost?: string
  hooks?: { [name: string]: string | string[] }
  userPlugins: boolean
  plugins?: string[]
  legacyConverter?: string
  topics?: { [name: string]: Topic }
}

export type PJSON = {
  name: string
  version: string
  dependencies: { [name: string]: string }
  'cli-engine': CLI
}

export type Config = {
  name: string // name of CLI
  dirname: string // name of CLI directory
  initPath?: string // path to init script
  commandsDir?: string // root path to CLI commands
  bin: string // name of binary
  updateHost: string | undefined // S3 update hostname
  root: string // root of CLI
  home: string // user home directory
  pjson: PJSON // parsed CLI package.json
  updateDisabled?: string | undefined // CLI updates are disabled
  defaultCommand: string // default command if no args passed (usually help)
  channel: string // CLI channel for updates
  version: string // CLI version
  debug: number // debugging level
  dataDir: string // directory for storing CLI data
  cacheDir: string // directory for storing temporary CLI data
  configDir: string // directory for storing CLI config
  arch: string // CPU architecture
  platform: string // operating system
  windows: boolean // is windows OS
  _version: '1' // config schema version
  skipAnalytics: boolean // skip processing of analytics
  install: string | undefined // generated uuid of this install
  userAgent: string // user agent for API calls
  shell: string // the shell in which the command is run
  hooks: { [name: string]: string[] } // scripts to run in the CLI on lifecycle events like prerun
  userConfig: UserConfig // users custom configuration json
  argv: string[]
  mock: boolean
  userPlugins: boolean
  topics: { [name: string]: Topic }
  legacyConverter?: string
  __cache: any // memoization cache
}

export type ConfigOptions = Partial<Config>

function dir(config: Config, category: string, d?: string): string {
  let cacheKey = `dir:${category}`
  let cache = config.__cache[cacheKey]
  if (cache) return cache
  d = d || path.join(config.home, category === 'data' ? '.local/share' : '.' + category)
  if (config.windows) d = process.env.LOCALAPPDATA || d
  d = process.env.XDG_DATA_HOME || d
  d = path.join(d, config.dirname)
  fs.mkdirpSync(d)
  config.__cache[cacheKey] = d
  return d
}

function debug(bin: string) {
  const debug = (process.env.DEBUG || '').includes('*') || envVarTrue(envVarKey(bin, 'DEBUG'))
  return debug ? 1 : 0
}

function envVarKey(...parts: string[]) {
  return parts
    .map(p => p.replace(/-/g, '_'))
    .join('_')
    .toUpperCase()
}

function envVarTrue(k: string): boolean {
  let v = process.env[k]
  return v === '1' || v === 'true'
}

function loadUserConfig(config: Config): UserConfig {
  const cache = config.__cache['userConfig']
  if (cache) return cache
  const configPath = path.join(config.configDir, 'config.json')
  let userConfig: UserConfig
  try {
    userConfig = fs.readJSONSync(configPath)
  } catch (e) {
    if (e.code === 'ENOENT') {
      userConfig = {}
    } else {
      throw e
    }
  }
  config.__cache['userConfig'] = userConfig

  if (config.skipAnalytics) delete userConfig.install
  else if (!userConfig.install) {
    const uuid = require('uuid/v4')
    userConfig.install = uuid()
    try {
      fs.writeJSONSync(configPath, userConfig)
    } catch (e) {
      delete userConfig.install
    }
  }

  return userConfig
}

function shell(onWindows: boolean = false): string {
  let shellPath
  let shell = process.env.SHELL
  let comspec = process.env.COMSPEC
  if (shell) {
    shellPath = shell.split(`/`)
  } else if (onWindows && comspec) {
    shellPath = comspec.split(/\\|\//)
  } else {
    shellPath = ['unknown']
  }
  return shellPath[shellPath.length - 1]
}

function userAgent(config: Config) {
  const channel = config.channel === 'stable' ? '' : ` ${config.channel}`
  return `${config.name}/${config.version}${channel} (${config.platform}-${config.arch}) node-${process.version}`
}

function commandsDir(config: ConfigOptions): string | undefined {
  if (!config.root || !config.pjson || !config.pjson['cli-engine']) return
  let commandsDir = config.pjson['cli-engine'].commands
  if (!commandsDir) return
  return path.join(config.root, commandsDir)
}

function hooks(prev: PJSON['cli-engine']['hooks']): { [name: string]: string[] } {
  let hooks = {} as Config['hooks']
  for (let [k, v] of Object.entries(prev || {})) {
    hooks[k] = Array.isArray(v) ? v : [v]
  }
  return hooks
}

function envSkipAnalytics(config: Config) {
  if (config.userConfig.skipAnalytics) {
    return true
  } else if (envVarTrue('TESTING') || envVarTrue(envVarKey(config.bin, 'SKIP_ANALYTICS'))) {
    return true
  }
  return false
}

function topics(topics: PJSON['cli-engine']['topics']) {
  topics = topics || {}
  for (let [k, v] of Object.entries(topics)) {
    if (!v.name) v.name = k
  }
  return topics
}

function updateHost(config: Config): string | undefined {
  const cli = config.pjson['cli-engine']
  if (cli.updateHost) return cli.updateHost
  if (cli.s3 && cli.s3.host) return cli.s3.host
}

// function validatePJSON (pjson: PJSON) {
// const exampleCLI = {
//   bin: 'heroku',
//   dirname: 'heroku',
//   node: '8.0.0',
//   defaultCommand: 'dashboard',
//   commands: './lib/commands',
//   hooks: {
//     init: './lib/hooks/init.js',
//     update: './lib/hooks/update.js',
//     prerun: './lib/hooks/prerun.js',
//     'plugins:preinstall': './lib/hooks/plugins/preinstall.js'
//   },
//   s3: {host: 'host'},
//   plugins: ['heroku-pg', 'heroku-redis']
// }
// TODO: validate
// const cli = pjson['cli-engine'] || {}
// const comment = 'cli-engine-config'
// const title = {
//   warning: 'invalid CLI package.json',
//   error: 'invalid CLI package.json' }
// validate(cli, {comment, title, exampleConfig: exampleCLI})
// validate(cli.hooks, {
//   comment,
//   condition: (option, validOption) => {
//     console.dir({option, validOption})
//   },
//   title,
//   exampleConfig: exampleCLI.hooks
// })
// }

export interface RunReturn {
  readonly stdout?: string
  readonly stderr?: string
}

export type Plugin = {
  name: string
  version: string
}

export interface ICommand {
  _version: string
  topic?: string | undefined
  command?: string | undefined
  description: string | undefined
  hidden: boolean
  usage: string | undefined
  help: string | undefined
  aliases: string[]
  id: string
  buildHelp?: (config: Config) => string
  buildHelpLine?: (config: Config) => [string, string | undefined]
  args?: IArg[]
  flags?: { [name: string]: Flag | ValueFlag<any> }
  run: (config?: ConfigOptions) => Promise<RunReturn | void>
  plugin?: Plugin
}

export function buildConfig(existing: ConfigOptions = {}): Config {
  if (!existing) existing = {}
  if (existing._version === '1') return existing as Config
  if (existing.root && !existing.pjson) {
    let pjsonPath = path.join(existing.root, 'package.json')
    if (fs.existsSync(pjsonPath)) {
      // parse the package.json at the root
      let pjson = fs.readJSONSync(path.join(existing.root, 'package.json'))
      existing.pjson = {
        ...defaultConfig.pjson,
        'cli-engine': {
          ...defaultConfig.pjson['cli-engine'],
          ...pjson['cli-engine'] || {},
        },
        ...pjson,
      }
    }
  }
  const pjson: PJSON = existing.pjson || {
    name: 'cli-engine',
    version: '0.0.0',
    dependencies: {},
    'cli-engine': {
      hooks: {},
      defaultCommand: 'help',
      userPlugins: false,
    },
  }
  return {
    _version: '1',
    pjson,
    channel: 'stable',
    home: os.homedir() || os.tmpdir(),
    root: path.join(__dirname, '..'),
    arch: os.arch() === 'ia32' ? 'x86' : os.arch(),
    platform: os.platform() === 'win32' ? 'windows' : os.platform(),
    mock: false,
    argv: process.argv.slice(1),
    name: pjson.name,
    version: pjson.version,
    hooks: hooks(pjson['cli-engine'].hooks),
    defaultCommand: pjson['cli-engine'].defaultCommand || 'help',
    topics: topics(pjson['cli-engine'].topics),
    commandsDir: commandsDir(existing),
    get windows() {
      return this.platform === 'windows'
    },
    get userAgent() {
      return userAgent(this)
    },
    get dirname() {
      return pjson['cli-engine'].dirname || this.bin
    },
    get shell() {
      return shell(this.windows)
    },
    get bin() {
      return pjson['cli-engine'].bin || this.name
    },
    get debug() {
      return debug(this.bin || 'cli-engine') || 0
    },
    get dataDir() {
      return dir(this, 'data')
    },
    get configDir() {
      return dir(this, 'config')
    },
    get cacheDir() {
      return dir(this, 'cache', this.platform === 'darwin' ? path.join(this.home, 'Library', 'Caches') : undefined)
    },
    get userConfig() {
      return loadUserConfig(this)
    },
    get skipAnalytics() {
      return envSkipAnalytics(this)
    },
    get install() {
      return this.userConfig.install
    },
    get updateHost() {
      return updateHost(this)
    },
    get legacyConverter() {
      return pjson['cli-engine'].legacyConverter
    },
    get userPlugins() {
      return pjson['cli-engine'].userPlugins
    },
    ...existing,
    __cache: {},
  }
}

export const defaultConfig = buildConfig()
