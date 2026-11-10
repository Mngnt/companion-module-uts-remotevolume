import { InstanceBase, InstanceStatus, runEntrypoint } from '@companion-module/base'
import { ConfigFields } from './config.js'
import { getActionDefinitions } from './actions.js'
import { variables } from './variables.js'
import { getFeedbackDefinitions } from './feedbacks.js'
import { getPresetDefinitions } from './presets.js'
import WebSocket from 'ws'
import {
	appActionMessage,
	appListKey,
	appVariableDefinitions,
	appVariableValues,
	sanitizeApps,
} from './apps.js'

class HDMIVideoWallProcessor extends InstanceBase {
	isInitialized = false
	reconnectInterval = 5000
	reconnectTimer = null

	async init(config) {
		this.config = config
		this.muted = null
		this.apps = []
		this.appListKey = appListKey(this.apps)

		this.setActionDefinitions(getActionDefinitions(this))
		this.setFeedbackDefinitions(getFeedbackDefinitions(this))
		this.setPresetDefinitions(getPresetDefinitions(this))
		this.setVariableDefinitions([...variables, ...appVariableDefinitions(this.apps)])

		this.initWebSocket()
		this.isInitialized = true
	}

	async destroy() {
		this.isInitialized = false
		if (this.reconnectTimer) {
			clearInterval(this.reconnectTimer)
			this.reconnectTimer = null
		}
		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
	}

	async configUpdated(config) {
		this.config = config
		this.initWebSocket()
	}

	maybeReconnect() {
		if (this.isInitialized && this.config.reconnect) {
			if (this.reconnectTimer) {
				clearInterval(this.reconnectTimer)
			}

			this.reconnectTimer = setInterval(() => {
				this.initWebSocket()
			}, this.reconnectInterval)
		}
	}

	initWebSocket() {
		if (this.reconnectTimer) {
			clearInterval(this.reconnectTimer)
			this.reconnectTimer = null
		}

		const url = 'ws://' + this.config.targetIp + ':' + this.config.targetPort
		if (!url || !this.config.targetIp) {
			this.updateStatus(InstanceStatus.BadConfig, `Target IP is missing`)
			return
		}

		this.updateStatus(InstanceStatus.Connecting)

		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
		this.ws = new WebSocket(url)
		if (!this.ws) {
			throw new Error('WebSocket initialization failed')
		}

		this.ws.addEventListener('open', () => {
			this.updateStatus(InstanceStatus.Ok)

			if (this.reconnectTimer) {
				clearInterval(this.reconnectTimer)
				this.reconnectTimer = null
			}
		})

		this.ws.addEventListener('close', (code) => {
			this.updateStatus(InstanceStatus.Disconnected, `Connection closed with code ${code}`)
			this.maybeReconnect()
		})

		this.ws.addEventListener('message', this.messageReceivedFromWebSocket.bind(this))

		this.ws.addEventListener('error', (data) => {
			this.log('error', data.message)
		})
	}

	setVolume(vol) {
		this.ws.send(
			JSON.stringify({
				action: 'setVolume',
				value: vol,
			})
		)
	}

	increaseVolume(vol) {
		this.ws.send(
			JSON.stringify({
				action: 'increaseVolume',
				value: vol,
			})
		)
	}

	decreaseVolume(vol) {
		this.ws.send(
			JSON.stringify({
				action: 'decreaseVolume',
				value: vol,
			})
		)
	}

	mute() {
		this.ws.send(
			JSON.stringify({
				action: 'mute',
			})
		)
	}

	unmute() {
		this.ws.send(
			JSON.stringify({
				action: 'unmute',
			})
		)
	}

	toggleMute() {
		this.ws.send(
			JSON.stringify({
				action: 'toggleMute',
			})
		)
	}

	getState() {
		this.ws.send(
			JSON.stringify({
				action: 'getState',
			})
		)
	}

	getApps() {
		this.send({ action: 'getApps' })
	}

	sendAppAction(action, app, value) {
		const message = appActionMessage(action, app, value)
		if (!message.app) {
			this.log('warn', `${action}: no app selected`)
			return
		}
		this.send(message)
	}

	send(message) {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			this.log('warn', `Not connected, could not send ${message.action}`)
			return
		}
		this.ws.send(JSON.stringify(message))
	}

	// Stores the full app list sent by the Remote Volume app. Action, feedback, preset and
	// variable definitions are only rebuilt when the set of apps changes, not on every
	// volume or mute change.
	updateApps(list) {
		this.apps = sanitizeApps(list)
		const key = appListKey(this.apps)
		if (key !== this.appListKey) {
			this.appListKey = key
			this.setActionDefinitions(getActionDefinitions(this))
			this.setFeedbackDefinitions(getFeedbackDefinitions(this))
			this.setPresetDefinitions(getPresetDefinitions(this))
			this.setVariableDefinitions([...variables, ...appVariableDefinitions(this.apps)])
		}
		this.setVariableValues(appVariableValues(this.apps))
		this.checkFeedbacks('app_muted')
	}

	parseStateObject(data) {
		if (!data || typeof data !== 'object') return
		if (data.response && typeof data.response === 'object' && 'error' in data.response) {
			this.log('error', `Remote Volume ${data.action ?? 'request'} failed: ${data.response.error}`)
		}
		if (Array.isArray(data.apps)) {
			this.updateApps(data.apps)
		}
		if ('muted' in data) {
			this.muted = data.muted
			this.setVariableValues({
				muted: this.muted,
			})
		}
		if ('volume' in data) {
			this.volume = data.volume
			this.setVariableValues({
				volume: this.volume,
			})
		}
		if ('outputDevice' in data) {
			this.outputDevice = data.outputDevice
			this.setVariableValues({
				output_audio_device_name: this.outputDevice,
			})
		}

		this.checkFeedbacks('muted')
	}

	async messageReceivedFromWebSocket(event) {
		if (event && event.data) {
			let msgValue = null
			let textData = ''

			try {
				if (event.data instanceof Blob) {
					textData = await event.data.text()
				} else {
					textData = event.data
				}

				if (textData.trim()) {
					msgValue = JSON.parse(textData)

					this.parseStateObject(msgValue)
				} else {
					console.error('Received empty or invalid JSON string.')
				}
			} catch (e) {
				console.error('Error parsing JSON:', e)
				console.error('Raw text data:', textData)
			}
		} else {
			console.error('Received event with no data:', event)
		}
	}

	getConfigFields() {
		return ConfigFields
	}
}

runEntrypoint(HDMIVideoWallProcessor, [])
