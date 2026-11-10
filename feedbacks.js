import { appOptions, literalAppOption, resolveAppOption } from './apps.js'

export function getFeedbackDefinitions(self) {
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
			options: appOptions(self.appRegistry.entries),
			// context.parseVariablesInString makes Companion re-check this feedback when a
			// variable used in the app name changes.
			callback: async (feedback, context) => {
				const app = await resolveAppOption(feedback.options, context)
				return self.appRegistry.findLive(app)?.muted === true
			},
			subscribe: (feedback) => {
				self.rememberApp(literalAppOption(feedback.options))
			},
		},
		app_running: {
			type: 'boolean',
			name: 'App has an audio session',
			description: 'Check if an application is running and has an audio session on the PC',
			options: appOptions(self.appRegistry.entries),
			callback: async (feedback, context) => {
				const app = await resolveAppOption(feedback.options, context)
				return Boolean(self.appRegistry.findLive(app))
			},
			subscribe: (feedback) => {
				self.rememberApp(literalAppOption(feedback.options))
			},
		},
	}
}
