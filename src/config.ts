import * as path from 'path'
import * as os from 'os'
import { flags, args } from 'cli-flags'
import * as fs from 'fs'

export type Topic = {
  name: string
  description?: string
  hidden?: boolean
}

export type S3 = {
  host?: string
}

export type CLI = {
  bin?: string
  dirname?: string
  defaultCommand?: string
  commands?: string
  s3?: S3
  hooks?: { [name: string]: string | string[] }
  aliases?: { [from: string]: string | string[] }
  userPlugins: boolean
  plugins?: string[]
  topics?: { [name: string]: Topic }
  npmRegistry?: string
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
  initPath: string // path to init script
  commandsDir: string // root path to CLI commands
  bin: string // name of binary
  s3: S3 // S3 config
  root: string // root of CLI
  home: string // user home directory
  pjson: PJSON // parsed CLI package.json
  updateDisabled: string // CLI updates are disabled
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
  install: string // generated uuid of this install
  userAgent: string // user agent for API calls
  shell: string // the shell in which the command is run
  hooks: { [name: string]: string[] } // scripts to run in the CLI on lifecycle events like prerun
  aliases: { [from: string]: string[] } // scripts to run in the CLI on lifecycle events like prerun
  argv: string[]
  userPlugins: boolean
  corePlugins: string[]
  topics: { [name: string]: Topic }
  errlog: string
  npmRegistry: string
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
  config.__cache[cacheKey] = d
  return d
}

function debug(bin: string) {
  try {
    let debug = require('debug')(bin).enabled || envVarTrue(envVarKey(bin, 'DEBUG'))
    return debug ? 1 : 0
  } catch (err) {
    return 0
  }
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

function readJSONSync(f: string): any {
  let d = fs.readFileSync(f, 'utf8')
  return JSON.parse(d)
}

function shell(onWindows: boolean = false): string {
  let shellPath
  const { SHELL, COMSPEC } = process.env
  if (SHELL) {
    shellPath = SHELL.split(`/`)
  } else if (onWindows && COMSPEC) {
    shellPath = COMSPEC.split(/\\|\//)
  } else {
    shellPath = ['unknown']
  }
  return shellPath[shellPath.length - 1]
}

function userAgent(config: Config) {
  const channel = config.channel === 'stable' ? '' : ` ${config.channel}`
  return `${config.name}/${config.version}${channel} (${config.platform}-${config.arch}) node-${process.version}`
}

function registry(config: Config): string {
  const env = process.env[envVarKey(config.bin, 'NPM_REGISTRY')]
  return env || config.pjson['cli-engine'].npmRegistry || 'https://registry.yarnpkg.com'
}

function commandsDir(config: Config): string | undefined {
  let commandsDir = config.pjson['cli-engine'].commands
  if (!commandsDir) return
  return path.join(config.root, commandsDir)
}

function toArray<T>(o: T | T[]): T[] {
  return Array.isArray(o) ? o : [o]
}

function objValsToArrays<T>(input?: { [k: string]: T | T[] }): { [k: string]: T[] } {
  return Object.entries(input || {}).reduce(
    (output, [k, v]) => {
      output[k] = toArray(v)
      return output
    },
    {} as { [k: string]: T[] },
  )
}

function topics(config: Config) {
  if (!config.__cache['topics']) {
    config.__cache['topics'] = config.pjson['cli-engine'].topics || {}
    for (let [k, v] of Object.entries(config.__cache['topics'])) {
      if (!v.name) v.name = k
    }
  }
  return config.__cache['topics']
}

export type AlphabetUppercase =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'X'
  | 'Y'
  | 'Z'
export type AlphabetLowercase =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'x'
  | 'y'
  | 'z'

export type CompletionContext = {
  args?: { [name: string]: string }
  flags?: { [name: string]: string }
  argv?: string[]
  config: Config
}

export type Completion = {
  skipCache?: boolean
  cacheDuration?: number
  cacheKey?: (completion: CompletionContext) => Promise<string>
  options: (completion: CompletionContext) => Promise<string[]>
}

export type Plugin = {
  name: string
  version: string
  type: string
  root: string
}

export interface ICommand {
  topic?: string
  command?: string
  description?: string
  hidden: boolean
  usage?: string
  help?: string
  _version: string
  id: string
  buildHelp: (config: Config) => string
  buildHelpLine: (config: Config) => [string, string | undefined]
  args?: args.IArg[]
  flags?: flags.Input
  run: (options: Config) => Promise<any>
  plugin?: Plugin
}

export function buildConfig(existing: ConfigOptions = {}): Config {
  if (!existing) existing = {}
  if (existing._version) return existing as any
  if (existing.root && !existing.pjson) {
    let pjsonPath = path.join(existing.root, 'package.json')
    try {
      // parse the package.json at the root
      let pjson = readJSONSync(path.join(existing.root, 'package.json'))
      existing.pjson = {
        ...defaultConfig.pjson,
        'cli-engine': {
          ...defaultConfig.pjson['cli-engine'],
          ...(pjson['cli-engine'] || {}),
        },
        ...pjson,
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      console.error(err)
    }
  }
  const pjson = {
    name: 'cli-engine',
    version: '0.0.0',
    dependencies: {},
    'cli-engine': {
      hooks: {},
      defaultCommand: 'help',
      userPlugins: false,
      s3: { host: null },
    },
    ...(existing.pjson || {}),
  }
  return {
    _version: '1',
    pjson,
    channel: 'stable',
    home: os.homedir() || os.tmpdir(),
    root: path.join(__dirname, '..'),
    arch: os.arch() === 'ia32' ? 'x86' : os.arch(),
    platform: os.platform() === 'win32' ? 'windows' : os.platform(),
    argv: process.argv.slice(1),
    version: pjson.version,
    defaultCommand: pjson['cli-engine'].defaultCommand,
    name: pjson.name,
    get hooks() {
      return objValsToArrays(this.pjson['cli-engine'].hooks)
    },
    get aliases() {
      return objValsToArrays({
        version: ['-v', '--version'],
        'plugins:uninstall': ['plugins:unlink'],
        ...this.pjson['cli-engine'].aliases,
      })
    },
    get windows() {
      return this.platform === 'windows'
    },
    get userAgent() {
      return userAgent(this)
    },
    get dirname() {
      return this.pjson['cli-engine'].dirname || this.bin
    },
    get shell() {
      return shell(this.windows)
    },
    get bin() {
      return this.pjson['cli-engine'].bin || this.name
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
    get updateDisabled() {
      const k = envVarKey(this.bin, 'SKIP_CORE_UPDATES')
      if (envVarTrue(k)) return `${k} is set to ${process.env[k]}`
    },
    get s3() {
      const config = this
      return {
        get host() {
          return config.pjson['cli-engine'].s3!.host || process.env[envVarKey(config.bin, 'S3_HOST')]
        },
      }
    },
    get commandsDir() {
      return commandsDir(this)
    },
    get corePlugins() {
      return this.pjson['cli-engine'].plugins || []
    },
    get userPlugins() {
      return this.pjson['cli-engine'].userPlugins
    },
    get topics() {
      return topics(this)
    },
    get errlog() {
      return path.join(this.cacheDir, 'error.log')
    },
    get npmRegistry() {
      return registry(this)
    },
    ...(<any>existing),
    __cache: {},
  }
}

export const defaultConfig = buildConfig()
