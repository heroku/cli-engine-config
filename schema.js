module.exports = {
  $id: 'heroku-cli',
  type: 'object',
  properties: {
    cliPjson: { $ref: '#/definitions/cli_pjson' },
    pluginPjson: { $ref: '#/definitions/plugin_pjson' },
    // command: { $ref: '#/definitions/command' },
  },
  definitions: {
    // command: {
    //   type: 'object',
    //   additionalProperties: false,
    //   required: [
    //     '_version'
    //   ],
    //   properties: {
    //     id: {type: 'string'},
    //     description: {type: 'string'},
    //     hidden: {type: 'boolean'},
    //     usage: {type: 'string'},
    //     help: {type: 'string'},
    //     _version: {type: 'string'},
    //     aliases: {type: 'array', items: {type: 'string'}},
    //     plugin: {type: 'object'},
    //     helpLine: {type: 'object'},
    //     run: {type: 'object'},
    //     args: {
    //       type: 'array',
    //       items: {
    //         type: 'object',
    //         additionalProperties: false,
    //         properties: {
    //           name: {type: 'string'},
    //           description: {type: 'string'},
    //           required: {type: 'boolean'},
    //           hidden: {type: 'boolean'},
    //         }
    //       }
    //     },
    //     flags: {
    //       type: 'object',
    //       additionalProperties: {
    //         type: 'object',
    //         additionalProperties: false,
    //         properties: {
    //           name: {type: 'string'},
    //           char: {type: 'string', maxLength: 1},
    //           description: {type: 'string'},
    //           hidden: {type: 'boolean'},
    //           required: {type: 'boolean'},
    //           allowNo: {type: 'boolean'},
    //           multiple: {type: 'boolean'},
    //         }
    //       }
    //     },
    //   },
    // },
    plugin_pjson: {
      type: 'object',
      properties: {
        'cli-engine': {
          type: 'object',
          additionalProperties: false,
          properties: {
            commands: { type: 'string' },
            topics: { $ref: '#/definitions/topics' },
          },
        },
      },
    },
    cli_pjson: {
      properties: {
        'cli-engine': {
          type: 'object',
          additionalProperties: false,
          properties: {
            bin: { type: 'string' },
            commands: { type: 'string' },
            defaultCommand: { type: 'string' },
            dirname: { type: 'string' },
            npmRegistry: { type: 'string' },
            userPlugins: { type: 'boolean' },
            plugins: { type: 'array', items: { type: 'string' } },
            hooks: {
              additionalProperties: {
                anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
              },
            },
            s3: {
              type: 'object',
              additionalProperties: false,
              properties: {
                host: { type: 'string' },
              },
            },
            topics: { $ref: '#/definitions/topics' },
          },
        },
      },
    },
    topics: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: { type: 'string' },
          hidden: { type: 'boolean' },
          subtopics: { $ref: '#/definitions/topics' },
        },
      },
    },
  },
}
