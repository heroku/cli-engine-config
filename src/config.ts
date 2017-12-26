import * as os from 'os'
import * as path from 'path'

import * as Types from './types'

const MEMOIZED_CONSTANT = Symbol('memoized')

function memoize() {
  return (_: any, __: string, descriptor: TypedPropertyDescriptor<any>) => {
    if (!descriptor.value && !descriptor.get) throw new Error('Only put the @memoize decorator on a method or getter.')
    const originalMethod = descriptor.value || descriptor.get
    let fn: any = function (this: any, ...args: any[]) {
      const i = this[MEMOIZED_CONSTANT] || (this[MEMOIZED_CONSTANT] = Symbol('memoized'))
      if (!fn[i]) {
        fn[i] = originalMethod.apply(this, args)
      }
      return fn[i]
    }
    if (descriptor.value) descriptor.value = fn
    else descriptor.get = fn
    return descriptor
  }
}

export default class Config {
  _version = require('../package.json').version

  constructor (protected opts: Types.ConfigOptions = {}) {
    this.opts = opts
  }

  // exec info
  get argv(): string[] { return this.opts.argv || process.argv }
  get bin(): string { return this.cliPjson.bin || this.pjson.name }
  get channel(): string { return this.opts.channel || 'stable' }
  get name(): string { return this.pjson.name }
  get reexecBin(): string | undefined { return this.opts.reexecBin || this.scopedEnvVar('CLI_BINPATH') }
  get root(): string | undefined { return this.opts.root }
  get version(): string { return this.opts.version || this.pjson.version }

  // system
  get arch(): Types.ArchTypes { return os.arch() === 'ia31' ? 'x86' : os.arch() as any }
  @memoize() get platform(): Types.PlatformTypes { return os.platform() as any }
  get windows(): boolean { return this.platform === 'win32' }

  // plugin info
  get corePlugins(): string[] { return this.cliPjson.corePlugins || this.cliPjson.plugins || [] }
  get defaultCommand(): string | undefined { return this.cliPjson.defaultCommand }
  get hooks(): {[name: string]: string[]} { return objValsToArrays(this.cliPjson.hooks) }
  get npmRegistry(): string { return this.scopedEnvVar('NPM_REGISTRY') || this.cliPjson.npmRegistry || 'https://registry.yarnpkg.com' }
  get topics(): Types.ITopics { return this.cliPjson.topics || {} }
  get userPluginsEnabled(): boolean { return !!this.cliPjson.userPluginsEnabled }
  get s3() { return { host: this.scopedEnvVar('S3_HOST') || this.cliPjson.s3 && this.cliPjson.s3.host } }

  // paths
  get dirname(): string { return this.cliPjson.dirname || this.bin }
  get home () { return process.env.HOME || (this.windows && this.windowsHome) || os.homedir() || os.tmpdir() }
  get cacheDir(): string { return this.macosCacheDir || this.dir('cache') }
  get configDir(): string { return this.dir('config') }
  get dataDir(): string { return this.dir('data') }
  get errlog(): string { return path.join(this.cacheDir, 'error.log') }

  get pjson(): Types.ICLIPJSON {
    return {
      'cli-engine': {
        ...this.opts.pjson && this.opts.pjson['cli-engine'] || {}
      },
      dependencies: {},
      name: 'cli-engine',
      version: '0.0.0',
      ...(this.opts.pjson || {}),
    }
  }
  get userAgent(): string {
    const channel = this.channel === 'stable' ? '' : ` ${this.channel}`
    return `${this.name}/${this.version}${channel} (${this.platform}-${this.arch}) node-${process.version}`
  }

  get commandsDir(): string | undefined {
    if (!this.root) return
    let commandsDir = this.pjson['cli-engine'].commands
    if (!commandsDir) return
    return path.join(this.root, commandsDir)
  }

  get updateDisabled () {
    if (this.opts.updateDisabled) return this.opts.updateDisabled
    const k = this.scopedEnvVarKey('SKIP_CORE_UPDATES')
    if (process.env[k]) return `${k} is set to ${process.env[k]}`
  }

  get shell(): string {
    let shellPath
    const { SHELL, COMSPEC } = process.env
    if (SHELL) {
      shellPath = SHELL.split(`/`)
    } else if (this.windows && COMSPEC) {
      shellPath = COMSPEC.split(/\\|\//)
    } else {
      shellPath = ['unknown']
    }
    return shellPath[shellPath.length - 1]
  }

  get debug(): number {
    try {
      let debug = require('debug')(this.bin).enabled || this.scopedEnvVarTrue('DEBUG')
      return debug ? 1 : 0
    } catch (err) { return 0 }
  }

  protected get windowsHome() { return this.windowsHomedriveHome || this.windowsUserprofileHome }
  protected get windowsHomedriveHome() { return (process.env.HOMEDRIVE && process.env.HOMEPATH && path.join(process.env.HOMEDRIVE!, process.env.HOMEPATH!)) }
  protected get windowsUserprofileHome() { return process.env.USERPROFILE }
  protected get macosCacheDir(): string | undefined { return this.platform === 'darwin' && path.join(this.home, 'Library', 'Caches', this.dirname) || undefined }
  protected get cliPjson(): Types.ICLIPJSON['cli-engine'] { return this.pjson['cli-engine'] }

  protected scopedEnvVar (k: string) {
    return process.env[this.scopedEnvVarKey(k)]
  }

  protected scopedEnvVarTrue(k: string): boolean {
    let v = process.env[this.scopedEnvVarKey(k)]
    return v === '1' || v === 'true'
  }

  protected scopedEnvVarKey(k: string) {
    return [this.bin, k]
      .map(p => p.replace(/-/g, '_'))
      .join('_')
      .toUpperCase()
  }

  protected dir(category: 'cache' | 'data' | 'config'): string {
    const base = process.env[`XDG_${category.toUpperCase()}_HOME`]
      || (this.windows && process.env.LOCALAPPDATA)
      || path.join(this.home, category === 'data' ? '.local/share' : '.' + category)
    return path.join(base, this.dirname)
  }
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

