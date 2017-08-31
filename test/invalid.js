#!/usr/bin/env babel-node

import {buildConfig} from '../src/config'

buildConfig({
  pjson: {
    s3: 'not a string'
  }
})
