import { type UserConfig } from './user-config'

describe('UserConfig', () => {
  test('has a skipAnalytics flag', () => {
    const userConfig: UserConfig = {skipAnalytics: true}
    expect(userConfig).toHaveProperty('skipAnalytics', true)
  })
})
