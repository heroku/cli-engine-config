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

export type CommandOptions = {
  aliases?: string[]
  description?: string
  hidden?: boolean
  usage?: string
  highlight?: boolean
  help?: string
  args?: InputArgs
  flags?: InputFlags
  strict?: boolean
}

export interface ICommand {
  options: CommandOptions
  buildHelp?: (config: ConfigOptions) => string
  buildHelpLine?: (config: ConfigOptions) => [string, string | undefined]
  _run: (argv?: string[]) => Promise<void>
  __config: {
    _version: string
    id?: string
    plugin?: Plugin
  }
}
