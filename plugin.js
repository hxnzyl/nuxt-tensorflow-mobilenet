import '@tensorflow/tfjs-backend-cpu'
import '@tensorflow/tfjs-backend-webgl'

// import * as cocoSsd from '@tensorflow-models/coco-ssd'
// const tf = require('@tensorflow/tfjs')

const mobilenetModule = require('@tensorflow-models/mobilenet')
const mobilenetClasses = require('@nuxt-tensorflow-mobilenet/IMAGENET_CLASSES.json')

const pluginOptions = JSON.parse('<%= JSON.stringify(options) %>')

function TensorflowMobilenetPlugin(options) {
	this.model = null
	this.detecting = false
	this.options = options
}

TensorflowMobilenetPlugin.prototype = {
	/**
	 * 创建实例
	 *
	 * @param {Object} options
	 * @returns
	 */
	create(options) {
		return new TensorflowMobilenetPlugin(options)
	},
	/**
	 * 销毁
	 */
	destroy() {
		this.model = null
	},
	/**
	 * 加载模型
	 *
	 * @returns
	 */
	load() {
		return new Promise((resolve, reject) => {
			if (this.model) return resolve(this.model)
			this.model = mobilenetModule
				.load(this.options)
				.then((model) => ((this.model = model), resolve(model)))
				.catch(reject)
		})
	},
	/**
	 * 视频分类
	 *
	 * @param {String} src
	 * @param {Number} imageNum 截图数量
	 * @param {Number} beginTime 截图开始时间
	 * @param {Number} endTime 截图结束时间
	 * @param {String} timeMode 截图时间分配模式。rnd:时间范围内随机分布, avg:时间范围内平均分布
	 * @returns
	 */
	videoClassify({ src, imageNum, beginTime, endTime, timeMode = 'rnd' }) {
		return new Promise((resolve, reject) => {
			if (this.detecting) return reject(new Error('detecting.'))

			if (imageNum <= 0) return reject(new Error('"imageNum" must be gt 0.'))

			this.load()
				.then(() => {
					this.detecting = true
					let detecting = false
					let detectNum = 1
					imageNum += 1

					let canPlay = false
					let screenshots = []

					let video = document.createElement('video')
					video.src = src
					video.muted = 'muted'
					video.autoplay = 'autoplay'
					video.controls = 'controls'
					video.currentTime = beginTime
					video.crossOrigin = 'anonymous'
					document.body.appendChild(video)

					video.addEventListener('error', (error) => {
						this.detecting = false
						reject(error)
					})

					video.addEventListener('canplay', () => {
						if (canPlay) return
						canPlay = true
						endTime = Math.min(video.duration, endTime)
						video.currentTime = stepTime() * detectNum
						setTimeout(screenshot, 16.7)
					})

					const stepTime = () => {
						//每张图片平均的间隔时间
						let avg = (endTime - beginTime) / imageNum
						return timeMode == 'rnd' ? Math.random() * (0 - avg) + avg : avg
					}

					const screenshot = () => {
						if (detecting) return
						if (video.readyState < 2) {
							console.log('nuxt-tensorflow: video loading...')
							setTimeout(screenshot, 16.7)
						} else if (detectNum > imageNum || video.currentTime >= endTime) {
							video.pause()
							this.detecting = false
							detecting = false
							detectNum = 0
							resolve(screenshots)
							screenshots = []
							video = null
						} else {
							//截取中
							detecting = true
							detectNum++
							//视频截图
							const canvas = document.createElement('canvas')
							canvas.width = video.videoWidth
							canvas.height = video.videoHeight
							const context = canvas.getContext('2d')
							context.drawImage(video, 0, 0, canvas.width, canvas.height)
							//图片分类
							this.model
								.classify(video)
								.then((predictions) => {
									screenshots.push({
										currentTime: video.currentTime,
										screenshots: canvas.toDataURL('image/jpg'),
										predictions: predictions.map((prediction) => ({
											className: prediction.className,
											probability: prediction.probability,
											chClassName: mobilenetClasses[prediction.className.split(/,\s*/).shift().replace(/\s+/, '_')]
										}))
									})
									detecting = false
									//重新定位
									video.currentTime = stepTime() * detectNum
									//继续截图
									setTimeout(screenshot, 16.7)
								})
								.catch((error) => {
									reject(error)
									detecting = false
								})
						}
					}
				})
				.catch(reject)
		})
	},
	/**
	 * 图片分类
	 *
	 * @param {String} src
	 * @param {Number} topk
	 * @returns
	 */
	imageClassify(src, topk) {
		return new Promise((resolve, reject) => {
			if (this.detecting) return reject(new Error('detecting.'))

			this.load()
				.then(() => {
					this.detecting = true
					let img = new Image()
					img.src = src
					img.crossOrigin = 'anonymous'
					img.onerror = (error) => {
						reject(error)
						this.detecting = false
					}
					img.onload = () => {
						img.onload = img.onerror = null
						this.model
							.classify(img, topk)
							.then((predictions) => {
								this.detecting = false
								img = null
								resolve(
									predictions.map((prediction) => ({
										className: prediction.className,
										probability: prediction.probability,
										chClassName: mobilenetClasses[prediction.className.split(/,\s*/).shift().replace(/\s+/, '_')]
									}))
								)
							})
							.catch((error) => {
								reject(error)
								this.detecting = false
							})
					}
				})
				.catch(reject)
		})
	}
}

export default (ctx, inject) => {
	const tfMobilenet = new TensorflowMobilenetPlugin(pluginOptions)
	ctx.$tfMobilenet = tfMobilenet
	inject('tfMobilenet', tfMobilenet)
}
