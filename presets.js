import { combineRgb } from '@companion-module/base'

export function getPresetDefinitions(self) {
	const presets = []

	presets.push({
		category: 'Volume',
		name: '+10%',
		type: 'button',
		style: {
			text: '+10%',
			size: '18',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'increaseVolume',
						options: { volume: 10 },
					},
				],
			},
		],
		feedbacks: [],
	})
	presets.push({
		category: 'Volume',
		name: '-10%',
		type: 'button',
		style: {
			text: '-10%',
			size: '18',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [
			{
				down: [
					{
						actionId: 'decreaseVolume',
						options: { volume: 10 },
					},
				],
			},
		],
		feedbacks: [],
	})
	presets.push({
		category: 'Mute',
		name: 'Toggle Mute',
		type: 'button',
		style: {
			text: 'Unmuted',
			size: '14',
			bgcolor: combineRgb(0, 255, 0),
			color: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'mute',
						options: { mute: 'toggle' },
					},
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'muted',
				options: {},
				style: {
					text: 'Muted',
					size: '18',
					bgcolor: combineRgb(255, 0, 0),
					color: combineRgb(255, 255, 255),
				},
			},
		],
	})

	// Per-app presets for every app in the last list. Until one arrives, an example
	// set for Spotify is shown; its app option can be changed after placing it.
	const apps = self.apps?.length ? self.apps : [{ name: 'spotify', title: 'Spotify', variableId: 'spotify' }]
	for (const app of apps) {
		presets.push(...getAppPresets(self, app))
	}

	return presets
}

function getAppPresets(self, app) {
	const label = app.title
	const volumeVar = `$(${self.label}:app_${app.variableId}_volume)`
	const button = (name, text, actionId, options, feedbacks = []) => ({
		category: 'App Volume',
		name: `${label} ${name}`,
		type: 'button',
		style: {
			text,
			size: '14',
			bgcolor: combineRgb(0, 0, 0),
			color: combineRgb(255, 255, 255),
		},
		steps: [{ down: [{ actionId, options: { app: app.name, ...options } }] }],
		feedbacks,
	})

	return [
		button('+10%', `${label}\n+10%\n${volumeVar}`, 'app_increase_volume', { volume: 10 }),
		button('-10%', `${label}\n-10%\n${volumeVar}`, 'app_decrease_volume', { volume: 10 }),
		button('Toggle Mute', `${label}\n${volumeVar}`, 'app_mute', { mute: 'toggle' }, [
			{
				feedbackId: 'app_muted',
				options: { app: app.name },
				style: {
					text: `${label}\nMuted`,
					bgcolor: combineRgb(255, 0, 0),
					color: combineRgb(255, 255, 255),
				},
			},
		]),
	]
}
