var webpack = require('webpack');

module.exports = {
	entry: {
		bundle: './test/index.coffee',
	},
	output: {
		path: __dirname + '/test/out',
		filename: "[name].js",
		pathinfo: true,
	},
	module: {
		loaders: [
			{ test: /\.coffee$/, loader: "coffee-loader" },
		],
	},
	devtool: 'inline-source-map',
	resolve: {
		extensions: ['.coffee', '.js'],
	},
}
