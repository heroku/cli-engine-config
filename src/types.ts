import { args, flags } from 'cli-flags'
import { Package } from 'read-pkg'

import { Config } from './config'

export * from './hooks'
export * from './engine'

export interface IPluginModuleTopic {
  name: string
  description?: string
  subtopics?: { [k: string]: IPluginModuleTopic }
  hidden?: boolean
}
export interface IPluginModule {
  commands: ICommand[]
  topic?: IPluginModuleTopic
  topics: IPluginModuleTopic[]
}
export interface IPluginPJSON extends Package {
  name: string
  version: string
  'cli-engine': {
    commands?: string
    topics?: { [k: string]: ITopic }
  }
}
export interface ITopics {
  [name: string]: ITopic
}
export interface ITopic {
  name: string
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

export interface ICLIPJSON extends Package {
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
  id?: string
  hidden: boolean
  base: '@cli-engine/command@1.0.0'
  aliases: string[]
  help: (config: Config) => string
  helpLine: (config: Config) => [string, string | undefined]
  run: (argv: string[], config: Config) => Promise<any>
}

export type PlatformTypes = 'darwin' | 'linux' | 'win32' | 'aix' | 'freebsd' | 'openbsd' | 'sunos'
export type ArchTypes = 'arm' | 'arm64' | 'mips' | 'mipsel' | 'ppc' | 'ppc64' | 's390' | 's390x' | 'x32' | 'x64' | 'x86'
