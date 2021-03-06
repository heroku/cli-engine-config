import { args, flags } from 'cli-flags'

import { Config } from './config'

export interface ITopics {
  [name: string]: ITopic
}
export interface ITopic {
  description?: string
  hidden?: boolean
  subtopics?: ITopics
}

export interface IS3 {
  host?: string
}

export interface ICLI {
  type: 'cli'
  bin?: string
  commands?: string
  defaultCommand?: string
  dirname?: string
  hooks?: { [name: string]: string | string[] }
  npmRegistry?: string
  plugins?: string[]
  corePlugins?: string[]
  s3?: IS3
  topics?: ITopics
  userPluginsEnabled?: boolean
}

export interface ICLIPJSON {
  name: string
  version: string
  dependencies: { [name: string]: string }
  'cli-engine': ICLI
}

export interface ConfigOptions {
  version?: string
  root?: string
  pjson?: ICLIPJSON
  argv?: string[]
  channel?: string
  updateDisabled?: string
  reexecBin?: string
  arch?: ArchTypes
  platform?: PlatformTypes
  dataDir?: string
  configDir?: string
  cacheDir?: string
}

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
  buildHelp: (config: Config) => string
  buildHelpLine: (config: Config) => [string, string | undefined]
  args?: args.IArg[]
  flags?: flags.Input
  run: (argv: string[], config: Config) => Promise<any>
  plugin?: IPlugin
}

export type PlatformTypes = 'darwin' | 'linux' | 'win32' | 'aix' | 'freebsd' | 'openbsd' | 'sunos'
export type ArchTypes = 'arm' | 'arm64' | 'mips' | 'mipsel' | 'ppc' | 'ppc64' | 's390' | 's390x' | 'x32' | 'x64' | 'x86'
