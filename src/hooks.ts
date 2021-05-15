import Config from './config'
import { ICommand, IPluginModule, IPluginPJSON } from './types'

export interface IHooks {
  init: {}
  update: {}
  'plugins:parse': {
    module: IPluginModule
    pjson: IPluginPJSON
  }
  prerun: {
    Command: ICommand
    argv: string[]
  }
}

export abstract class Hook<T extends keyof IHooks> {
  protected readonly debug = require('debug')(`cli:hook:${this.options.event}`)
  constructor(protected config: Config, protected options: IHooks[T] & { event: T }) {}
  public abstract run(): Promise<void>
}

export interface Hooks {
  run<T extends keyof IHooks>(event: T, options?: IHooks[T]): Promise<void>
}
