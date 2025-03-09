const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Base copy patterns
const copyPatterns = [{ from: './wasm/wfslib_web.wasm', to: './' }];

// Add source map in development
if (isDevelopment && fs.existsSync(path.join(__dirname, 'wasm/wfslib_web.wasm.map'))) {
  copyPatterns.push({ from: './wasm/wfslib_web.wasm.map', to: './' });
}

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      fs: false,
      path: false,
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: copyPatterns,
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      ...(isDevelopment
        ? [
            // Serve cpp bindings source files
            {
              directory: path.join(__dirname, 'cpp'),
              publicPath: '/cpp',
            },
            // Serve wfslib include files
            {
              directory: path.join(__dirname, 'submodules/wfslib/include'),
              publicPath: '/submodules/wfslib/include',
            },
            // Serve wfslib source files
            {
              directory: path.join(__dirname, 'submodules/wfslib/src'),
              publicPath: '/submodules/wfslib/src',
            },
          ]
        : []),
    ],
    compress: true,
    port: 9000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      ...(isDevelopment && { SourceMap: 'true' }),
    },
    ...(isDevelopment && {
      devMiddleware: {
        writeToDisk: true,
      },
    }),
  },
};
