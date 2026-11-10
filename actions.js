import { appOptions, literalAppOption, resolveAppOption } from './apps.js'

export function getActionDefinitions(self) {
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
		app_set_volume: appAction(self, {
			name: 'App: Set Volume [absolute]',
			description: "Set an application's own volume level (Windows and Linux)",
			options: [{ type: 'number', id: 'volume', label: 'Volume', default: 50, min: 0, max: 100 }],
			message: () => 'setAppVolume',
		}),
		app_increase_volume: appAction(self, {
			name: 'App: Increase Volume',
			description: "Increase an application's own volume level (Windows and Linux)",
			options: [{ type: 'number', id: 'volume', label: 'Increase by', default: 10, min: 1, max: 99 }],
			message: () => 'increaseAppVolume',
		}),
		app_decrease_volume: appAction(self, {
			name: 'App: Decrease Volume',
			description: "Decrease an application's own volume level (Windows and Linux)",
			options: [{ type: 'number', id: 'volume', label: 'Decrease by', default: 10, min: 1, max: 99 }],
			message: () => 'decreaseAppVolume',
		}),
		app_mute: appAction(self, {
			name: 'App: Set Mute',
			description: 'Mute, unmute or toggle an application (Windows and Linux)',
			options: [
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
			message: (options) => ({ mute: 'muteApp', unmute: 'unmuteApp', toggle: 'toggleAppMute' })[options.mute],
		}),
		getApps: {
			name: 'App: Refresh app list',
			description:
				'Ask Remote Volume for the current list of apps with an audio session, e.g. after starting an app while polling is off',
			options: [],
			callback: async () => {
				self.getApps()
			},
		},
		forgetApps: {
			name: 'App: Forget unused apps',
			description:
				"Remove apps that aren't running and aren't used in any action or feedback from the app list, variables and presets",
			options: [],
			callback: async () => {
				self.forgetUnusedApps()
			},
		},
	}
}

// An app action: the shared app options plus its own, sending the message for the
// resolved app name. Names used in actions stay known (with their variables) even
// while the app isn't running, for as long as an action uses them.
function appAction(self, { name, description, options, message }) {
	return {
		name,
		description,
		options: [...appOptions(self.appRegistry.entries), ...options],
		callback: async (action, context) => {
			const app = await resolveAppOption(action.options, context)
			const actionName = message(action.options)
			if (actionName) self.sendAppAction(actionName, app, action.options.volume)
		},
		subscribe: (action) => {
			self.referenceApp(`action:${action.id}`, literalAppOption(action.options))
		},
		unsubscribe: (action) => {
			self.unreferenceApp(`action:${action.id}`)
		},
	}
}
