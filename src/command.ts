import { ConfigOptions } from './config'
import { InputArgs, InputFlags } from 'cli-flags'

export type Topic = {
  name: string
  description?: string
  hidden?: boolean
}

export type Plugin = {
  name: string
  version: string
}

export interface ICommand {
  _version: string
  topic?: string | undefined
  command?: string | undefined
  description?: string
  hidden: boolean
  usage?: string
  help?: string
  aliases: string[]
  id: string
  buildHelp?: (config: ConfigOptions) => string
  buildHelpLine?: (config: ConfigOptions) => [string, string | undefined]
  Args?: InputArgs
  Flags?: InputFlags
  init: () => Promise<void>
  run: () => Promise<void>
  done: () => Promise<void>
  plugin?: Plugin
}
