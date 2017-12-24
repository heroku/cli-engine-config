#!/usr/bin/env ts-node

import { buildConfig } from '../src/config'

let config = buildConfig({
  pjson: {
    name: 'foo',
    version: '1.0.0',
    dependencies: {},
    'cli-engine': {
      // s3: 'not a string',
      hooks: {
        notahook: 'butlookslikeone',
      },
      // this doesn't work for some reason
      // plugins: [
      //   {a: 'b'},
      //   1
      // ]
    },
  },
} as any)
// tslint:disable-next-line
console.dir(config)
