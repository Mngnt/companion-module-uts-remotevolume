import { InstanceBase, InstanceStatus, runEntrypoint } from '@companion-module/base'
import { ConfigFields } from './config.js'
import { getActionDefinitions } from './actions.js'
import { variables } from './variables.js'
import { getFeedbackDefinitions } from './feedbacks.js'
import { getPresetDefinitions } from './presets.js'
import WebSocket from 'ws'
import { AppRegistry, appActionMessage, appVariableDefinitions, appVariableValues } from './apps.js'

class HDMIVideoWallProcessor extends InstanceBase {
	isInitialized = false
	reconnectInterval = 5000
	reconnectTimer = null

	async init(config) {
		this.config = config
		this.muted = null
		this.appRegistry = new AppRegistry()
		this.appDefinitionsKey = undefined
		this.refreshApps()

		this.initWebSocket()
		this.isInitialized = true
	}

	async destroy() {
		this.isInitialized = false
		clearTimeout(this.appRefreshTimer)
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
		const ws = new WebSocket(url)
		this.ws = ws
		if (!this.ws) {
			throw new Error('WebSocket initialization failed')
		}

		// Events from a socket that has since been replaced (after a config change or a
		// reconnect) are ignored, so a late close of the old socket can't schedule a
		// reconnect that drops the new connection.
		this.ws.addEventListener('open', () => {
			if (ws !== this.ws) return
			this.updateStatus(InstanceStatus.Ok)

			if (this.reconnectTimer) {
				clearInterval(this.reconnectTimer)
				this.reconnectTimer = null
			}
		})

		this.ws.addEventListener('close', (event) => {
			if (ws !== this.ws) return
			this.updateStatus(InstanceStatus.Disconnected, `Connection closed with code ${event?.code ?? event}`)
			// No apps are known to be running until Remote Volume sends its list again on
			// reconnect. Known apps keep their variables and buttons.
			if (this.isInitialized) this.updateApps([])
			this.maybeReconnect()
		})

		this.ws.addEventListener('message', (event) => {
			if (ws !== this.ws) return
			this.messageReceivedFromWebSocket(event)
		})

		this.ws.addEventListener('error', (data) => {
			if (ws !== this.ws) return
			this.log('error', data.message)
		})
	}

	setVolume(vol) {
		this.send({ action: 'setVolume', value: vol })
	}

	increaseVolume(vol) {
		this.send({ action: 'increaseVolume', value: vol })
	}

	decreaseVolume(vol) {
		this.send({ action: 'decreaseVolume', value: vol })
	}

	mute() {
		this.send({ action: 'mute' })
	}

	unmute() {
		this.send({ action: 'unmute' })
	}

	toggleMute() {
		this.send({ action: 'toggleMute' })
	}

	getState() {
		this.send({ action: 'getState' })
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

	// Stores the full app list sent by the Remote Volume app.
	updateApps(list) {
		this.appRegistry.setLive(list)
		this.refreshApps()
	}

	// Tracks the app named in an action or feedback, so its variables exist before it
	// first plays audio and are removed again once nothing names it. Called from
	// subscribe/unsubscribe, which Companion runs for every action and feedback at
	// startup and on every keypress while an option is edited, so the rebuild waits
	// until the edits settle.
	referenceApp(id, name) {
		if (this.appRegistry.reference(id, name)) this.scheduleAppRefresh()
	}

	unreferenceApp(id) {
		if (this.appRegistry.unreference(id)) this.scheduleAppRefresh()
	}

	// Forgets apps that aren't running and aren't used in any action or feedback.
	forgetUnusedApps() {
		const count = this.appRegistry.forgetUnused()
		this.log('info', `Forgot ${count} app${count === 1 ? '' : 's'} that aren't running or used`)
		if (count) this.refreshApps()
	}

	scheduleAppRefresh() {
		clearTimeout(this.appRefreshTimer)
		this.appRefreshTimer = setTimeout(() => {
			if (this.isInitialized) this.refreshApps()
		}, 500)
	}

	// Action, feedback, preset and variable definitions are only rebuilt when an app is
	// added or starts or stops running, not on every volume or mute change.
	refreshApps() {
		const entries = this.appRegistry.entries
		const key = this.appRegistry.definitionsKey()
		if (key !== this.appDefinitionsKey) {
			this.appDefinitionsKey = key
			this.setActionDefinitions(getActionDefinitions(this))
			this.setFeedbackDefinitions(getFeedbackDefinitions(this))
			this.setPresetDefinitions(getPresetDefinitions(this))
			this.setVariableDefinitions([...variables, ...appVariableDefinitions(entries)])
		}
		this.setVariableValues(appVariableValues(entries))
		this.checkFeedbacks('app_muted', 'app_running')
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
