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
  id: string
  description?: string
  hidden: boolean
  usage?: string
  help?: string
  aliases: string[]
  buildHelp?: (config: ConfigOptions) => string
  buildHelpLine?: (config: ConfigOptions) => [string, string | undefined]
  plugin?: Plugin
  parse: {
    args?: InputArgs
    flags?: InputFlags
    strict?: boolean
  }
  _run: (argv?: string[]) => Promise<void>
}
