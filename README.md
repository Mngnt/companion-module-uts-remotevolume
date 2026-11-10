# companion-module-uts-remotevolume

Bitfocus Companion module for the [Remote Volume](https://github.com/ultimategmbh/remote-volume) application, which controls the audio volume of Windows, macOS and Linux PCs over a WebSocket connection (default port 2501).

## Features

- **Master volume**: set, increase or decrease the volume, and mute, unmute or toggle mute. Includes a "Muted" feedback and the `volume`, `muted` and `output_audio_device_name` variables.
- **Per-application volume** (Windows and Linux, with a Remote Volume version that supports it): set, increase or decrease the volume of a single app such as Spotify or a browser, and mute, unmute or toggle it. Includes an "App muted" feedback, `app_<name>_volume` / `app_<name>_muted` variables for every app with an audio session, an `app_names` variable, and +10% / -10% / Toggle Mute presets per app. Apps are picked from the list sent by Remote Volume, or by typing a process name (e.g. `spotify`).

See [companion/HELP.md](companion/HELP.md) for setup and the full list of actions, feedbacks and variables, and [LICENSE](LICENSE) for the license.

## Development

```bash
yarn install       # @companion-module/base expects Node 18 or 22; add --ignore-engines on other versions
yarn package       # companion-module-build: writes the installable .tgz package
```

The per-app helpers (app name matching, variable ids, the JSON sent for app actions) are in `apps.js`.
