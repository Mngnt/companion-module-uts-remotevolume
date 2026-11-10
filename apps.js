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

// Keeps only well-formed entries, and gives each a unique variable id.
export function sanitizeApps(list) {
	const seen = new Set()
	const apps = []
	for (const app of Array.isArray(list) ? list : []) {
		if (!app || typeof app.name !== 'string' || !app.name.trim()) continue
		let id = appVariableId(app.name)
		for (let i = 2; seen.has(id); i++) id = `${appVariableId(app.name)}_${i}`
		seen.add(id)
		apps.push({
			name: app.name,
			title: typeof app.title === 'string' && app.title ? app.title : app.name,
			pids: Array.isArray(app.pids) ? app.pids : [],
			volume: typeof app.volume === 'number' ? app.volume : undefined,
			muted: typeof app.muted === 'boolean' ? app.muted : undefined,
			active: Boolean(app.active),
			variableId: id,
		})
	}
	return apps
}

// Builds the JSON object sent for an app action. Only the volume actions carry `value`.
export function appActionMessage(action, app, value) {
	if (!APP_ACTIONS.includes(action)) throw new Error(`Unknown app action: ${action}`)
	const message = { action, app: String(app ?? '').trim() }
	if (action.endsWith('Volume')) message.value = Number(value)
	return message
}

// Dropdown choices for the app option: the names from the last apps list.
export function appChoices(apps) {
	return apps.map((app) => ({
		id: app.name,
		label: app.title !== app.name ? `${app.title} (${app.name})` : app.name,
	}))
}

// Shared `app` option: a dropdown of known apps that also accepts any typed name.
export function appOption(apps) {
	return {
		type: 'dropdown',
		id: 'app',
		label: 'App (process name, e.g. spotify)',
		default: apps[0]?.name ?? '',
		choices: appChoices(apps),
		allowCustom: true,
		tooltip:
			'Pick an app that has an audio session, or type its process name or title (case-insensitive, .exe optional)',
	}
}

// Ids of all apps, used to tell whether the definitions need rebuilding.
export function appListKey(apps) {
	return JSON.stringify(apps.map((app) => [app.name, app.title, app.variableId]))
}

export function appVariableDefinitions(apps) {
	const defs = [{ name: 'Names of the apps with an audio session (comma separated)', variableId: 'app_names' }]
	for (const app of apps) {
		defs.push({ name: `${app.title}: volume`, variableId: `app_${app.variableId}_volume` })
		defs.push({ name: `${app.title}: mute state`, variableId: `app_${app.variableId}_muted` })
	}
	return defs
}

export function appVariableValues(apps) {
	const values = { app_names: apps.map((app) => app.name).join(', ') }
	for (const app of apps) {
		values[`app_${app.variableId}_volume`] = app.volume
		values[`app_${app.variableId}_muted`] = app.muted
	}
	return values
}
