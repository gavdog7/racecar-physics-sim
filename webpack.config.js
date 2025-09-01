import path from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'racing-sim.bundle.js',
      clean: true
    },
    resolve: {
      extensions: ['.js', '.json'],
      alias: {
        'dat.gui': path.resolve(__dirname, 'node_modules/dat.gui/build/dat.gui.module.js'),
        'stats.js': path.resolve(__dirname, 'node_modules/stats.js/build/stats.min.js')
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', {
                modules: false
              }]]
            }
          }
        },
        {
          test: /\.(png|jpg|jpeg|gif|glb|gltf)$/i,
          type: 'asset/resource'
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        title: 'Racing Physics Simulation'
      })
    ],
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: isProduction
          }
        }
      })]
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      compress: true,
      port: 8080,
      hot: true
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
}