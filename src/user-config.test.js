// @flow

import { type UserConfig } from './user-config'

describe('UserConfig', () => {
  test('has a skipAnalytics flag', () => {
    const userConfig: UserConfig = {skipAnalytics: true, install: '1234'}
    expect(userConfig).toHaveProperty('skipAnalytics', true)
    expect(userConfig).toHaveProperty('install', '1234')
  })
})
