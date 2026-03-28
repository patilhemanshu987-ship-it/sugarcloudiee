const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      // Core Node.js modules
      stream: require.resolve('stream-browserify'),  // Changed from readable-stream
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      crypto: require.resolve('crypto-js'), // Changed to crypto-js
      url: require.resolve('url'),
      util: require.resolve('util'),
      assert: require.resolve('assert'),
      buffer: require.resolve('buffer'),
      events: require.resolve('events'),
      process: require.resolve('process'),
      dns: require.resolve('dns.js'),
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      fs: require.resolve('react-native-fs'),
      zlib: require.resolve('browserify-zlib'),  
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);