const fs = require('fs')
const {
  hasYarn,
} = require('@vue/cli-shared-utils')
const chalk = require('chalk')

module.exports = (api, options, rootOptions) => {
  api.extendPackage({
    dependencies: {
      'vue-apollo': '^3.0.0-beta.10',
    },
    devDependencies: {
      'graphql-tag': '^2.5.0',
    },
  })

  // Vue config
  if (options.addServer) {
    // Modify vue config
    api.extendPackage({
      dependencies: {
        'graphql-type-json': '^0.2.1',
      },
      scripts: {
        'graphql-api': 'vue-cli-service graphql-api',
        'run-graphql-api': 'vue-cli-service run-graphql-api',
      },
      vue: {
        pluginOptions: {
          graphqlMock: options.addMocking,
          apolloEngine: options.addApolloEngine,
        },
      },
    })
  }

  api.render('./templates/vue-apollo/default', {
    ...options,
  })

  if (options.addExamples) {
    api.render('./templates/vue-apollo/examples', {
      ...options,
    })
  }

  if (options.addServer) {
    api.render('./templates/api-server/default', {
      ...options,
    })

    if (options.addExamples) {
      api.extendPackage({
        dependencies: {
          'lowdb': '^1.0.0',
          'mkdirp': '^0.5.1',
          'shortid': '^2.2.8',
        },
      })

      api.render('./templates/api-server/examples', {
        ...options,
      })
    }
  }

  if (options.addServer && api.hasPlugin('eslint')) {
    api.extendPackage({
      devDependencies: {
        'eslint-plugin-graphql': '^2.1.1',
      },
      eslintConfig: {
        plugins: [
          'graphql',
        ],
        rules: {
          'graphql/template-strings': ['error', {
            env: 'literal',
          }],
        },
      },
    })
  }

  // Modify main.js
  try {
    const tsPath = api.resolve('src/main.ts')
    const jsPath = api.resolve('src/main.js')

    const tsExists = fs.existsSync(tsPath)
    const jsExists = fs.existsSync(jsPath)

    if (!tsExists && !jsExists) {
      throw new Error('No entry found')
    }

    const file = tsExists ? 'src/main.ts' : 'src/main.js'
    api.injectImports(file, `import { createProvider } from './vue-apollo'`)
    api.injectRootOptions(file, `provide: createProvider().provide(),`)
  } catch (e) {
    api.exitLog(`Your main file couldn't be modified. You will have to edit the code yourself: https://github.com/Akryum/vue-cli-plugin-apollo#manual-code-changes`, 'warn')
  }

  api.onCreateComplete(() => {
    if (options.addServer) {
      // Git ignore
      {
        const gitignorePath = api.resolve('.gitignore')
        let content

        if (fs.existsSync(gitignorePath)) {
          content = fs.readFileSync(gitignorePath, { encoding: 'utf8' })
        } else {
          content = ''
        }

        if (content.indexOf('/live/') === -1) {
          content += '\n/live/\n'

          fs.writeFileSync(gitignorePath, content, { encoding: 'utf8' })
        }
      }
    }

    if (options.addApolloEngine) {
      // Modify .env.local file
      const envPath = api.resolve('.env.local')
      let content = ''

      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, { encoding: 'utf8' })
      }

      if (content.indexOf('VUE_APP_APOLLO_ENGINE_KEY=') === -1) {
        content += `VUE_APP_APOLLO_ENGINE_KEY=${options.apolloEngineKey}\n`
      } else {
        content = content.replace(/VUE_APP_APOLLO_ENGINE_KEY=(.*)\n/, `VUE_APP_APOLLO_ENGINE_KEY=${options.apolloEngineKey}`)
      }
      fs.writeFileSync(envPath, content, { encoding: 'utf8' })
    }

    // Linting
    if (api.hasPlugin('eslint')) {
      // ESlint ignore
      if (options.addServer) {
        const filePath = api.resolve('.eslintignore')
        let content

        if (fs.existsSync(filePath)) {
          content = fs.readFileSync(filePath, { encoding: 'utf8' })
        } else {
          content = ''
        }

        if (content.indexOf('schema.graphql') === -1) {
          content += '\nschema.graphql\n'

          fs.writeFileSync(filePath, content, { encoding: 'utf8' })
        }
      }

      // Lint generated/modified files
      try {
        const lint = require('@vue/cli-plugin-eslint/lint')
        lint({ silent: true }, api)
      } catch (e) {
        // No ESLint vue-cli plugin
      }
    }

    if (options.addServer) {
      api.exitLog(`Start the GraphQL API Server with ${chalk.cyan(`${hasYarn() ? 'yarn' : 'npm'} run graphql-api`)}`, 'info')
      if (options.addMocking) {
        api.exitLog(`Customize the mocks in ${chalk.cyan('src/graphql-api/mocks.js')}`, 'info')
      }
      if (options.addApolloEngine) {
        api.exitLog(`The Apollo Engine API key has been added to ${chalk.cyan('.local.env')}`, 'info')
      }
    }
  })
}
