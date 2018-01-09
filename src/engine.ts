import { Observable } from 'rxjs/Observable'

import { Hooks } from './hooks'
import { ICommand, IPlugin, ITopic } from './types'

export interface IUserPluginInstallOpts {
  type: 'user'
  name: string
  tag?: string
}
export interface ILinkPluginInstallOpts {
  type: 'link'
  root: string
}

export interface IPluginManager {
  readonly plugins: Observable<IPlugin>
  readonly commands: Observable<ICommand>
  readonly topics: Observable<ITopic>

  install(opts: IUserPluginInstallOpts | ILinkPluginInstallOpts): Promise<void>
  uninstall(name: string): Promise<boolean>
  update(): Promise<void>
}

export interface IEngine {
  readonly hooks: Hooks
  readonly plugins: IPluginManager

  readonly topics: Promise<ITopic[]>
  readonly commands: Promise<ICommand[]>
  readonly commandIDs: Promise<string[]>
  readonly rootTopics: Promise<ITopic[]>
  readonly rootCommands: Promise<ICommand[]>

  findCommand(id: string, must: true): Promise<ICommand>
  findCommand(id: string, must?: boolean): Promise<ICommand | undefined>

  findTopic(id: string, must: true): Promise<ITopic>
  findTopic(id: string, must?: boolean): Promise<ITopic | undefined>
}
