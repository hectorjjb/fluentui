const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

const tsBin = require.resolve('typescript');
const tsConfigPath = path.resolve(__dirname, '../../../tsconfig.base.wc.json');

const tsPaths = new TsconfigPathsPlugin({
  configFile: tsConfigPath,
});

module.exports = /** @type {import('@storybook/react-webpack5').StorybookConfig} */ ({
  addons: [
    {
      name: '@storybook/addon-essentials',
      options: {
        backgrounds: false,
        viewport: false,
        toolbars: false,
        actions: false,
      },
    },
  ],

  stories: ['../src/**/*.stories.tsx'],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      builder: {
        lazyCompilation: false,
      },
    },
  },
  typescript: {
    // disable react-docgen-typescript (totally not needed here, slows things down a lot)
    reactDocgen: false,
  },
  webpackFinal: async config => {
    config.resolve = config.resolve ?? {};
    config.resolve.extensions = config.resolve.extensions ?? [];
    config.resolve.plugins = config.resolve.plugins ?? [];
    config.module = config.module ?? {};
    config.plugins = config.plugins ?? [];

    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs', '.mts'],
    };
    config.resolve.extensions.push(...['.ts', '.js']);
    config.resolve.plugins.push(tsPaths);
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push(
      {
        test: /\.([cm]?ts|tsx)$/,
        loader: 'ts-loader',
        sideEffects: true,
        options: {
          transpileOnly: true,
          compiler: tsBin,
        },
      },
      // Following config is needed to be able to resolve @storybook packages imported in specified files that don't ship valid ESM
      // It also enables importing other packages without proper ESM extensions, but that should be avoided !
      // @see https://webpack.js.org/configuration/module/#resolvefullyspecified
      {
        test: /\.m?js/,
        resolve: { fullySpecified: false },
      },
    );

    config.plugins.push(
      new CircularDependencyPlugin({
        exclude: /node_modules/,
        failOnError: process.env.NODE_ENV === 'production',
      }),
    );

    // Disable ProgressPlugin which logs verbose webpack build progress. Warnings and Errors are still logged.
    if (process.env.TF_BUILD) {
      config.plugins = config.plugins.filter(({ constructor }) => constructor.name !== 'ProgressPlugin');
    }

    return config;
  },
  // 💡 NOTE: this is necessary for StoryWright. without this the current version "0.0.27-storybook7.9" wont take screenshots for Steps
  features: {
    storyStoreV7: false,
  },
});
