const { resolve } = require('path')
const consola = require('consola')
const { defu } = require('defu')

const meta = require('./package.json')

module.exports = function tensorflowMobilenetModule(_moduleOptions) {
	const { runtimeConfig, tensorflowMobilenet = {} } = this.options

	// Resolve dir
	const rootDir = resolve(__dirname, './')

	// Combine options
	const moduleOptions = {
		...tensorflowMobilenet,
		..._moduleOptions,
		...(runtimeConfig && runtimeConfig.tensorflowMobilenet)
	}

	// Apply defaults
	const options = defu(moduleOptions, {
		//mobilenet
		version: process.env.TENSORFLOW_MOBILENT_VERSION || 2,
		alpha: process.env.TENSORFLOW_MOBILENT_ALPHA || 1,
		modelUrl: process.env.TENSORFLOW_MOBILENT_MODEL_URL || '/mobilenet_v2_100_224/model.json'
		//coco-ssd
		// base: 'mobilenet_v2',
		//lite_mobilenet_v2
		//mobilenet_v1,
		//mobilenet_v2
	})

	// Add component alias
	this.extendBuild((config) => {
		// Self alias
		config.resolve.alias['@nuxt-tensorflow-mobilenet'] = rootDir
	})

	// Register plugin
	this.addPlugin({
		src: resolve(__dirname, 'plugin.js'),
		fileName: 'nuxt-tensorflow-mobilenet.js',
		options
	})

	consola.info(meta.name + ': v' + meta.version)
}

module.exports.meta = meta
