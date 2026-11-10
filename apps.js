// Helpers for per-application volume. The Remote Volume app sends the full list as
// {apps: [{name, title, pids, volume, muted, active}]} on connect, in reply to getApps,
// and whenever it changes.

export const APP_ACTIONS = [
	'setAppVolume',
	'increaseAppVolume',
	'decreaseAppVolume',
	'muteApp',
	'unmuteApp',
	'toggleAppMute',
]

// Dropdown choice that switches the app option to a text field that accepts variables.
export const APP_TEXT_CHOICE = '__text__'

// Same matching rule as the Remote Volume app: case-insensitive, `.exe` optional.
export function normalizeAppName(name) {
	return String(name ?? '')
		.trim()
		.toLowerCase()
		.replace(/\.exe$/, '')
}

// Variable-safe id for an app name, e.g. "Google Chrome.exe" -> "google_chrome".
export function appVariableId(name) {
	return (
		normalizeAppName(name)
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '') || 'unknown'
	)
}

// Returns the app matching a name or title from the given list, or undefined.
export function findApp(apps, target) {
	const wanted = normalizeAppName(target)
	if (!wanted) return undefined
	return (
		apps.find((app) => normalizeAppName(app.name) === wanted) ??
		apps.find((app) => normalizeAppName(app.title) === wanted)
	)
}

// Keeps only well-formed entries of an apps message.
export function sanitizeApps(list) {
	const apps = []
	for (const app of Array.isArray(list) ? list : []) {
		if (!app || typeof app.name !== 'string' || !app.name.trim()) continue
		apps.push({
			name: app.name,
			title: typeof app.title === 'string' && app.title ? app.title : app.name,
			pids: Array.isArray(app.pids) ? app.pids : [],
			volume: typeof app.volume === 'number' ? app.volume : undefined,
			muted: typeof app.muted === 'boolean' ? app.muted : undefined,
			active: Boolean(app.active),
		})
	}
	return apps
}

// Every app seen since the module started, or named in an action or feedback, plus the
// apps that currently have an audio session. Known apps keep their variables, dropdown
// entry and presets when they quit, so buttons keep working when the app is relaunched
// (or when Companion starts before the app does).
export class AppRegistry {
	known = new Map() // normalized name -> { name, title, variableId }
	live = []

	// Adds an app by name. Returns true if it was not known before.
	remember(name, title) {
		const key = normalizeAppName(name)
		if (!key || key.includes('$(')) return false
		const existing = this.known.get(key)
		if (existing) {
			if (title && existing.title !== title) existing.title = title
			return false
		}
		const ids = new Set([...this.known.values()].map((app) => app.variableId))
		const base = appVariableId(name)
		let variableId = base
		for (let i = 2; ids.has(variableId); i++) variableId = `${base}_${i}`
		this.known.set(key, { name: String(name).trim(), title: title || String(name).trim(), variableId })
		return true
	}

	// Replaces the list of running apps (an empty list while disconnected).
	setLive(list) {
		this.live = sanitizeApps(list)
		for (const app of this.live) this.remember(app.name, app.title)
	}

	// Known apps, each with its live state (running false and no volume when not running).
	get entries() {
		return [...this.known.values()].map((app) => {
			const live = findApp(this.live, app.name)
			return {
				...app,
				// Prefer the live process name, e.g. "Spotify.exe" over a typed "spotify".
				name: live?.name ?? app.name,
				title: live?.title ?? app.title,
				running: Boolean(live),
				volume: live?.volume,
				muted: live?.muted,
				active: live?.active ?? false,
			}
		})
	}

	// Running app matching a name or title.
	findLive(target) {
		return findApp(this.live, target)
	}

	// Changes whenever action/feedback/preset/variable definitions need rebuilding.
	definitionsKey() {
		return JSON.stringify(this.entries.map((app) => [app.name, app.title, app.variableId, app.running]))
	}
}

// Builds the JSON object sent for an app action. Only the volume actions carry `value`.
export function appActionMessage(action, app, value) {
	if (!APP_ACTIONS.includes(action)) throw new Error(`Unknown app action: ${action}`)
	const message = { action, app: String(app ?? '').trim() }
	if (action.endsWith('Volume')) message.value = Number(value)
	return message
}

// Dropdown choices for the app option: running apps first, then apps seen earlier.
export function appChoices(entries) {
	const sorted = [...entries.filter((app) => app.running), ...entries.filter((app) => !app.running)]
	return [
		...sorted.map((app) => ({
			id: app.name,
			label:
				(app.title !== app.name ? `${app.title} (${app.name})` : app.name) + (app.running ? '' : ' - not running'),
		})),
		{ id: APP_TEXT_CHOICE, label: 'Text or variable…' },
	]
}

// The app options shared by all app actions and feedbacks: a dropdown of known apps that
// also accepts a typed name, and a text field with variable support for the
// "Text or variable…" choice.
export function appOptions(entries) {
	const firstRunning = entries.find((app) => app.running) ?? entries[0]
	return [
		{
			type: 'dropdown',
			id: 'app',
			label: 'App (process name, e.g. spotify)',
			default: firstRunning?.name ?? APP_TEXT_CHOICE,
			choices: appChoices(entries),
			allowCustom: true,
			tooltip:
				'Pick an app, type its process name or title (case-insensitive, .exe optional), or choose "Text or variable…" to use variables',
		},
		{
			type: 'textinput',
			id: 'app_text',
			label: 'App name or variable',
			default: '',
			useVariables: true,
			tooltip: 'Process name or title, may contain variables, e.g. $(internal:custom_app)',
			isVisible: (options) => options.app === '__text__',
			isVisibleExpression: `$(options:app) == '${APP_TEXT_CHOICE}'`,
		},
	]
}

// The app name an action or feedback refers to, with variables replaced.
export async function resolveAppOption(options, context) {
	let value = options?.app === APP_TEXT_CHOICE ? options?.app_text : options?.app
	value = String(value ?? '')
	if (value.includes('$(') && context?.parseVariablesInString) {
		value = await context.parseVariablesInString(value)
	}
	return value.trim()
}

// The literal app name of an action or feedback, if it has one (no variables).
export function literalAppOption(options) {
	const value = options?.app === APP_TEXT_CHOICE ? options?.app_text : options?.app
	const name = String(value ?? '').trim()
	return name && !name.includes('$(') ? name : undefined
}

export function appVariableDefinitions(entries) {
	const defs = [{ name: 'Names of the apps with an audio session (comma separated)', variableId: 'app_names' }]
	for (const app of entries) {
		defs.push({ name: `${app.title}: volume`, variableId: `app_${app.variableId}_volume` })
		defs.push({ name: `${app.title}: mute state`, variableId: `app_${app.variableId}_muted` })
		defs.push({ name: `${app.title}: has an audio session`, variableId: `app_${app.variableId}_running` })
	}
	return defs
}

export function appVariableValues(entries) {
	const values = {
		app_names: entries
			.filter((app) => app.running)
			.map((app) => app.name)
			.join(', '),
	}
	for (const app of entries) {
		values[`app_${app.variableId}_volume`] = app.running ? app.volume : ''
		values[`app_${app.variableId}_muted`] = app.running ? app.muted : ''
		values[`app_${app.variableId}_running`] = app.running
	}
	return values
}
