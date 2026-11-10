import { appOption } from './apps.js'

export function getActionDefinitions(self) {
	const apps = self.apps ?? []
	return {
		set_volume: {
			name: 'Set Volume [absolute]',
			description: 'Set the absolute volume level',
			options: [
				{
					type: 'number',
					id: 'volume',
					label: 'Volume',
					default: 50,
					min: 0,
					max: 100,
				},
			],
			callback: async (action) => {
				self.setVolume(action.options.volume)
			},
		},
		increaseVolume: {
			name: 'Increase Volume',
			description: 'Set the absolute volume level',
			options: [
				{
					type: 'number',
					id: 'volume',
					label: 'Increase by',
					default: 10,
					min: 1,
					max: 99,
				},
			],
			callback: async (action) => {
				self.increaseVolume(action.options.volume)
			},
		},
		decreaseVolume: {
			name: 'Decrease Volume',
			description: 'Set the absolute volume level',
			options: [
				{
					type: 'number',
					id: 'volume',
					label: 'Decrease by',
					default: 10,
					min: 1,
					max: 99,
				},
			],
			callback: async (action) => {
				self.decreaseVolume(action.options.volume)
			},
		},
		mute: {
			name: 'Set Mute',
			description: 'Set the mute state',
			options: [
				{
					type: 'dropdown',
					id: 'mute',
					label: 'Mute',
					default: 'mute',
					choices: [
						{ id: 'mute', label: 'Mute' },
						{ id: 'unmute', label: 'Unmute' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				switch (action.options.mute) {
					case 'mute':
						self.mute()
						break
					case 'unmute':
						self.unmute()
						break
					case 'toggle':
						self.toggleMute()
				}
			},
		},
		getState: {
			name: 'Get latest Data',
			description: 'Retrieve the latest information manually if polling is disabled',
			options: [],
			callback: async (action) => {
				self.getState()
			},
		},
		app_set_volume: {
			name: 'App: Set Volume [absolute]',
			description: "Set an application's own volume level (Windows and Linux)",
			options: [
				appOption(apps),
				{ type: 'number', id: 'volume', label: 'Volume', default: 50, min: 0, max: 100 },
			],
			callback: async (action) => {
				self.sendAppAction('setAppVolume', action.options.app, action.options.volume)
			},
		},
		app_increase_volume: {
			name: 'App: Increase Volume',
			description: "Increase an application's own volume level (Windows and Linux)",
			options: [
				appOption(apps),
				{ type: 'number', id: 'volume', label: 'Increase by', default: 10, min: 1, max: 99 },
			],
			callback: async (action) => {
				self.sendAppAction('increaseAppVolume', action.options.app, action.options.volume)
			},
		},
		app_decrease_volume: {
			name: 'App: Decrease Volume',
			description: "Decrease an application's own volume level (Windows and Linux)",
			options: [
				appOption(apps),
				{ type: 'number', id: 'volume', label: 'Decrease by', default: 10, min: 1, max: 99 },
			],
			callback: async (action) => {
				self.sendAppAction('decreaseAppVolume', action.options.app, action.options.volume)
			},
		},
		app_mute: {
			name: 'App: Set Mute',
			description: 'Mute, unmute or toggle an application (Windows and Linux)',
			options: [
				appOption(apps),
				{
					type: 'dropdown',
					id: 'mute',
					label: 'Mute',
					default: 'toggle',
					choices: [
						{ id: 'mute', label: 'Mute' },
						{ id: 'unmute', label: 'Unmute' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (action) => {
				const message = { mute: 'muteApp', unmute: 'unmuteApp', toggle: 'toggleAppMute' }[action.options.mute]
				if (message) self.sendAppAction(message, action.options.app)
			},
		},
		getApps: {
			name: 'App: Get latest app list',
			description: 'Ask for the list of apps with an audio session (it is also sent automatically when it changes)',
			options: [],
			callback: async () => {
				self.getApps()
			},
		},
	}
}
