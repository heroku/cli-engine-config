import * as os from 'os'
import * as path from 'path'
import {deprecate, inspect} from 'util'

import * as Types from './types'

export * from './types'

export class Config {
  _version = require('../package.json').version

  constructor (protected opts: Types.ConfigOptions = {}) {
    this.opts = opts
  }

  // exec info
  get argv(): string[] { return this.opts.argv || process.argv }
  @memoize() get bin(): string { return this.cliPjson.bin || this.pjson.name }
  @memoize() get channel(): string { return this.opts.channel || 'stable' }
  @memoize() get name(): string { return this.pjson.name }
  @memoize() get reexecBin(): string | undefined { return this.opts.reexecBin || this.scopedEnvVar('CLI_BINPATH') }
  @memoize() get root(): string | undefined { return this.opts.root }
  @memoize() get version(): string { return this.opts.version || this.pjson.version }

  // system
  @memoize() get arch(): Types.ArchTypes { return this.opts.arch || (os.arch() === 'ia32' ? 'x86' : os.arch() as any) }
  @memoize() get platform(): Types.PlatformTypes { return this.opts.platform || (os.platform() as any) }
  @memoize() get windows(): boolean { return this.platform === 'win32' }

  // plugin info
  @memoize() get corePlugins(): string[] { return this.cliPjson.corePlugins || this.cliPjson.plugins || [] }
  @memoize() get defaultCommand(): string | undefined { return this.cliPjson.defaultCommand }
  @memoize() get hooks(): {[name: string]: string[]} { return objValsToArrays(this.cliPjson.hooks) }
  @memoize() get npmRegistry(): string { return this.scopedEnvVar('NPM_REGISTRY') || this.cliPjson.npmRegistry || 'https://registry.yarnpkg.com' }
  @memoize() get topics(): Types.ITopics { return this.cliPjson.topics || {} }
  @memoize() get userPluginsEnabled(): boolean { return !!this.cliPjson.userPluginsEnabled }
  @memoize() get s3() { return { host: this.scopedEnvVar('S3_HOST') || this.cliPjson.s3 && this.cliPjson.s3.host } }

  // paths
  @memoize() get dirname(): string { return this.cliPjson.dirname || this.bin }
  @memoize() get home () { return process.env.HOME || (this.windows && this.windowsHome) || os.homedir() || os.tmpdir() }
  @memoize() get cacheDir(): string { return this.macosCacheDir || this.dir('cache') }
  @memoize() get configDir(): string { return this.dir('config') }
  @memoize() get dataDir(): string { return this.dir('data') }
  @memoize() get errlog(): string { return path.join(this.cacheDir, 'error.log') }

  @memoize() get pjson(): Types.ICLIPJSON {
    if (!this.opts.pjson && this.root) {
      this.opts.pjson = require(path.join(this.root, 'package.json'))
    }
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

  @memoize()
  get userAgent(): string {
    const channel = this.channel === 'stable' ? '' : ` ${this.channel}`
    return `${this.name}/${this.version}${channel} (${this.platform}-${this.arch}) node-${process.version}`
  }

  @memoize()
  get commandsDir(): string | undefined {
    if (!this.root) return
    let commandsDir = this.pjson['cli-engine'].commands
    if (!commandsDir) return
    return path.join(this.root, commandsDir)
  }

  @memoize()
  get updateDisabled () {
    if (this.opts.updateDisabled) return this.opts.updateDisabled
    const k = this.scopedEnvVarKey('SKIP_CORE_UPDATES')
    if (process.env[k]) return `${k} is set to ${process.env[k]}`
  }

  @memoize()
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

  @memoize()
  get debug(): number {
    try {
      let debug = require('debug')(this.bin).enabled || this.scopedEnvVarTrue('DEBUG')
      return debug ? 1 : 0
    } catch (err) { return 0 }
  }

  [inspect.custom](depth: number, options: NodeJS.InspectOptions & {stylize: any}) {
    if (depth < 0) return options.stylize(`[Config ${this.userAgent}]`, 'special')
    let props: any = {
      userAgent: this.userAgent,
    }
    if (this.root) props.root = this.root
    if (this.reexecBin) props.reexecBin = this.reexecBin
    if (depth > 1) props = {...props, home: this.home, shell: this.shell, dataDir: this.dataDir, cacheDir: this.cacheDir}

    const newOptions = {...options, depth: (options.depth === null) ? null : (options.depth || 0 - 1)} as NodeJS.InspectOptions
    const padding = ' '.repeat(7)
    const inner = inspect(props, newOptions).replace(/\n/g, `\n${padding}`);

    return `${options.stylize('Config', 'special')} ${inner}`
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
export default Config

export const buildConfig = deprecate(
  (opts?: Types.ConfigOptions) => new Config(opts),
  '`buildConfig()` is deprecated. Use `new Config()` instead.'
)

function toArray<T>(o: T | T[]): T[] {
  return Array.isArray(o) ? o : [o]
}

function objValsToArrays<T>(input?: { [k: string]: T | T[] }): { [k: string]: T[] } {
  input = input || {}
  return Object.keys(input).reduce(
    (output, k) => {
      output[k] = toArray(input![k])
      return output
    },
    {} as { [k: string]: T[] },
  )
}

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
