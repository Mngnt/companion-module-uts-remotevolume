import { appOption, findApp } from './apps.js'

export function getFeedbackDefinitions(self) {
	const apps = self.apps ?? []
	return {
		muted: {
			type: 'boolean',
			name: 'Muted',
			description: 'Check if the audio is currently muted',
			options: [],
			callback: (feedback) => {
				return self.muted
			},
		},
		app_muted: {
			type: 'boolean',
			name: 'App muted',
			description: 'Check if an application is currently muted (false while the app has no audio session)',
			options: [appOption(apps)],
			callback: (feedback) => {
				return findApp(self.apps ?? [], feedback.options.app)?.muted === true
			},
		},
	}
}
