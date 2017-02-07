const path = require('path');

module.exports = {
  entry: {
    'main-with': './src/main-with.js',
    'main-without': './src/main-without.js',
    'worker': './src/worker.js'
  },
  output: {
      filename: '[name].js',
      path: path.join(__dirname, 'dist')
  },
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel-loader',
      query: { presets: [ 'es2015', 'react', 'stage-0' ] }
    }]
  }
};
