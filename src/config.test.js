// @flow

import {buildConfig} from './config'
import os from 'os'
import path from 'path'

test('default props are set', () => {
  const config = buildConfig()
  expect(config.name).toEqual('cli-engine')
  expect(config.dirname).toEqual('cli-engine')
  expect(config.version).toEqual('0.0.0')
  expect(config.channel).toEqual('stable')
  expect(config.updateDisabled).toBeUndefined()
  expect(config.bin).toEqual('cli-engine')
  expect(config.root).toEqual(path.join(__dirname, '..'))
  expect(config.defaultCommand).toEqual('help')
  expect(config.s3).toEqual({})
  expect(config.windows).toEqual(os.platform === 'win32')
})

test('reads pjson values', () => {
  const config = buildConfig({pjson: {
    name: 'mycli',
    version: '1.0.0',
    'cli-engine': {
      dirname: 'heroku'
    }
  }})
  expect(config.name).toEqual('mycli')
  expect(config.version).toEqual('1.0.0')
  expect(config.dirname).toEqual('heroku')
})

test('sets version from options', () => {
  const config = buildConfig({version: '1.0.0-foobar'})
  expect(config.version).toEqual('1.0.0-foobar')
})
