import { args, flags } from 'cli-flags'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

export interface ITopic {
  name: string
  description?: string
  hidden?: boolean
}

export interface IS3 {
  host?: string
}

export interface ICLI {
  bin?: string
  dirname?: string
  defaultCommand?: string
  commands?: string
  s3?: IS3
  hooks?: { [name: string]: string | string[] }
  aliases?: { [from: string]: string | string[] }
  userPlugins: boolean
  plugins?: string[]
  topics?: { [name: string]: ITopic }
  npmRegistry?: string
}

export interface ICLIPJSON {
  name: string
  version: string
  dependencies: { [name: string]: string }
  'cli-engine': ICLI
}

export interface IConfig {
  name: string // name of CLI
  dirname: string // name of CLI directory
  initPath: string // path to init script
  commandsDir: string // root path to CLI commands
  bin: string // name of binary
  s3: IS3 // S3 config
  root: string // root of CLI
  home: string // user home directory
  pjson: ICLIPJSON // parsed CLI package.json
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
  userAgent: string // user agent for API calls
  shell: string // the shell in which the command is run
  hooks: { [name: string]: string[] } // scripts to run in the CLI on lifecycle events like prerun
  aliases: { [from: string]: string[] } // scripts to run in the CLI on lifecycle events like prerun
  argv: string[]
  userPlugins: boolean
  corePlugins: string[]
  topics: { [name: string]: ITopic }
  errlog: string
  npmRegistry: string
}

export type ConfigOptions = Partial<IConfig>

function dir(config: IConfig, category: string, d?: string): string {
  let cacheKey = `dir:${category}`
  d = d || path.join(config.home, category === 'data' ? '.local/share' : '.' + category)
  if (config.windows) d = process.env.LOCALAPPDATA || d
  d = process.env.XDG_DATA_HOME || d
  d = path.join(d, config.dirname)
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

function userAgent(config: IConfig) {
  const channel = config.channel === 'stable' ? '' : ` ${config.channel}`
  return `${config.name}/${config.version}${channel} (${config.platform}-${config.arch}) node-${process.version}`
}

function registry(config: IConfig): string {
  const env = process.env[envVarKey(config.bin, 'NPM_REGISTRY')]
  return env || config.pjson['cli-engine'].npmRegistry || 'https://registry.yarnpkg.com'
}

function commandsDir(config: IConfig): string | undefined {
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

function topics(config: IConfig) {
  let topics: { [k: string]: ITopic } = config.pjson['cli-engine'].topics || {}
  for (let [k, v] of Object.entries(topics)) {
    if (!v.name) v.name = k
  }
  return topics
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

export interface IPlugin {
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
  aliases: string[]
  buildHelp: (config: IConfig) => string
  buildHelpLine: (config: IConfig) => [string, string | undefined]
  args?: args.IArg[]
  flags?: flags.Input
  run: (argv: string[], config: IConfig) => Promise<any>
  plugin?: IPlugin
}

export function buildConfig(existing: ConfigOptions = {}): IConfig {
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
      throw err
    }
  }
  const pjson = {
    'cli-engine': {
      defaultCommand: 'help',
      hooks: {},
      s3: { host: null },
      userPlugins: false,
    },
    dependencies: {},
    name: 'cli-engine',
    version: '0.0.0',
    ...(existing.pjson || {}),
  }
  return {
    _version: '1',
    arch: os.arch() === 'ia32' ? 'x86' : os.arch(),
    argv: process.argv.slice(1),
    channel: 'stable',
    defaultCommand: pjson['cli-engine'].defaultCommand,
    home: os.homedir() || os.tmpdir(),
    name: pjson.name,
    pjson,
    platform: os.platform() === 'win32' ? 'windows' : os.platform(),
    root: path.join(__dirname, '..'),
    version: pjson.version,
    get hooks() {
      return objValsToArrays(this.pjson['cli-engine'].hooks)
    },
    get aliases() {
      return objValsToArrays(this.pjson['cli-engine'].aliases)
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
    ...(existing as any),
  }
}

export const defaultConfig = buildConfig()
