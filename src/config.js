// @flow

import path from 'path'
import os from 'os'

type S3 = {
  host?: string,
  bucket?: string
}

type CLI = {
  defaultCommand?: string,
  bin?: string,
  s3?: S3,
  plugins?: string[]
}

export type PJSON = {
  name?: ?string,
  version?: ?string,
  dependencies?: ?{[name: string]: string},
  'cli-engine'?: ?CLI
}

export type ConfigOptions = {
  mock?: boolean,
  root?: string,
  updateDisabled?: ?string,
  channel?: string,
  version?: string,
  debug?: number,
  argv?: string[]
}

function debug () {
  const HEROKU_DEBUG = process.env.HEROKU_DEBUG
  if (HEROKU_DEBUG === 'true') return 1
  if (HEROKU_DEBUG) return parseInt(HEROKU_DEBUG)
  return 0
}

class Dirs {
  constructor (config: Config) {
    this._config = config
  }

  _config: Config

  get home (): string { return os.homedir() || os.tmpdir() }
  get data (): string { return this._fetch('data') }
  get config (): string { return this._fetch('config') }
  get cache (): string {
    let def
    if (process.platform === 'darwin') def = path.join(this.home, 'Library', 'Caches')
    return this._fetch('cache', def)
  }

  get _fs () { return require('fs-extra') }
  _mkdirp (dir: string) { this._fs.mkdirpSync(dir) }

  _fetch (category: string, d?: ?string): string {
    d = d || path.join(this.home, category === 'data' ? '.local/share' : '.' + category)
    if (this.windows) d = process.env.LOCALAPPDATA || d
    d = process.env.XDG_DATA_HOME || d
    d = path.join(d, this._config.name)
    this._mkdirp(d)
    return d
  }

  toJSON () {
    return {
      cache: this.cache,
      data: this.data,
      config: this.config,
      home: this.home
    }
  }
}

export default class Config {
  constructor (options: ConfigOptions | Config = {}) {
    this._options = options
    this._pjson = this._options.root
        // flow$ignore
      ? require(path.join(options.root, 'package.json'))
      : {}
    this.debug = debug() || options.debug || 0
    this.dirs = new Dirs(this)
    this.mock = options.mock || false
    this.argv = options.argv || []
  }

  dirs: Dirs
  argv: string[]
  debug: number
  mock: boolean
  _pjson: PJSON
  _options: ConfigOptions | Config

  get name ():string { return this._pjson.name || 'cli-engine' }
  get version ():string { return this._options.version || this._pjson.version || '0.0.0' }
  get channel ():string { return this._options.channel || 'stable' }
  get updateDisabled (): ?string { return this._options.updateDisabled }
  get bin (): string { return this._cli.bin || this._pjson.name || 'cli-engine' }
  get root (): string { return this._options.root || path.join(__dirname, '..') }
  get defaultCommand (): string { return this._cli.defaultCommand || 'help' }
  get s3 (): S3 { return this._cli.s3 || {} }
  get _cli (): CLI { return this._pjson['cli-engine'] || {} }
  get windows (): boolean { return os.platform === 'win32' }

  toJSON () {
    return {
      name: this.name,
      version: this.version,
      channel: this.channel,
      mock: this.mock,
      updateDisabled: this.updateDisabled,
      bin: this.bin,
      defaultCommand: this.defaultCommand,
      root: this.root,
      s3: this.s3,
      windows: this.windows,
      debug: this.debug,
      dirs: this.dirs
    }
  }
}

export type ICommand = {
  topic: string,
  command: ?string,
  description: ?string,
  hidden: ?boolean,
  usage: ?string,
  help: ?string,
  aliases: string[],
  _version: string,
  id: string,
  run: (argv: string[], config: Config) => Promise<any>,
  mock: (argv: ?string[], config: ?Config) => Promise<any>
}
