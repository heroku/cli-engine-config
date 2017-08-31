#!/usr/bin/env babel-node

import {buildConfig} from '../src/config'

buildConfig({
  pjson: {
    'cli-engine': {
      // s3: 'not a string',
      hooks: {
        notahook: 'butlookslikeone'
      },
      // this doesn't work for some reason
      // plugins: [
      //   {a: 'b'},
      //   1
      // ]
    }
  }
})
