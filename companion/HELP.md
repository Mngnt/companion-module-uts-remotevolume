## UTS Remote Volume Module

This module is for controlling the Ultimate Technology Solutions Remote Volume application. This allows you to control the volume of PCs in the network by Companion.

For this module to work, a helper application must be installed on all PCs that are to be remote-controlled. This helper application enables communication between the PC and the Companion instance.

You can download the latest release of the helper application, called [Remote Volume](https://github.com/ultimategmbh/remote-volume/releases/latest) from the UTS GitHub releases page. The link will always get you to the latest version.

- For Windows: Download and install the .exe file.
- For OSX: Download the corresponding .dmg file (x64 for Intel processors or ARM for Apple M Processors.), open the .dmg and drag&drop the app into your applications folder.
- For Linux: Download and install the .deb file

After the Remote Volume application is installed, make sure that the application is running in the background, to ensure that Companion can connect to the application.

In the module configuration, simply enter the IP address of the PC which is running the Remote Volume software and make sure that the 'port' setting in the module configuration matches the configured port in the Remote Volume application configuration window.

### Per-application volume

Newer versions of the Remote Volume application can also control the volume of single applications, such as Spotify or a browser, the same way as the Windows Volume Mixer. This works on Windows and on Linux (PulseAudio or PipeWire). macOS has no per-application volume, so these actions log an error there. Older versions of the Remote Volume application do not support them.

An app with several audio streams (e.g. a browser) is controlled as one. An app's volume is its own level in the mixer, relative to the master volume.

**Choosing the app**

Every app action and feedback has an **App** option. You can:

- **Pick** an app from the list. It shows the apps that have an audio session on the PC, followed by apps seen earlier that are not running right now.
- **Type** a process name or title into the same field, case-insensitive and with or without `.exe` (e.g. `spotify`, `chrome`, `Google Chrome`). This works for apps that haven't been started yet.
- Choose **Text or variable…** and fill in the **App name or variable** field. It accepts plain text and variables, e.g. `$(internal:custom_app)`, which are replaced when the button is pressed. Feedbacks update when the variable changes.

**Refreshing the list of apps**

Remote Volume sends the list of apps when Companion connects, and again whenever it changes after an app action or a poll. If polling is off in the Remote Volume application, an app you start afterwards appears after the next app action, or when you press a button with **App: Refresh app list** (there is a preset for it). To have the list update on its own, enable polling in the Remote Volume application.

**When apps or Remote Volume restart**

Buttons always send the app's name, never its process id, so they keep working when an app is quit and started again. While it isn't running, Remote Volume replies with an error (shown in the module's log), and the app's variables and feedbacks show it as not running.

Every app seen since the module started, and every app named in an action or feedback, stays in the list with its variables while the module runs. After Companion or the connection restarts, apps used in buttons are added again straight away, and the others as they appear. If Remote Volume is quit or the PC restarts, all apps show as not running until the module reconnects (every 5 seconds while **Reconnect** is enabled in the connection settings), and then Remote Volume sends the list again.

**Actions**

- **App: Set Volume [absolute]**: set the app's volume to 0–100. Sends `{"action":"setAppVolume","app":"spotify","value":50}`.
- **App: Increase Volume** / **App: Decrease Volume**: change the app's volume by 1–99. Sends `increaseAppVolume` / `decreaseAppVolume`.
- **App: Set Mute**: mute, unmute or toggle the app. Sends `muteApp`, `unmuteApp` or `toggleAppMute`.
- **App: Refresh app list**: ask Remote Volume for the current list of apps. Sends `getApps`.

**Feedbacks**

- **App muted**: true while the selected app is muted. It is false while the app has no audio session.
- **App has an audio session**: true while the selected app is running and has an audio session on the PC.

**Variables**

- `app_names`: the process names of all apps with an audio session, comma separated.
- `app_<name>_volume`, `app_<name>_muted` and `app_<name>_running` for every known app. `<name>` is the process name in lower case without `.exe`, with anything other than letters and digits replaced by `_`. For example, `chrome.exe` gives `app_chrome_volume`. While an app isn't running, `_running` is `false` and `_volume` and `_muted` are empty.

**Presets**

The **App Volume** category has a Refresh app list button, and +10%, -10% and Toggle Mute buttons for every known app. Until an app is known, it shows an example set for Spotify. You can change the app of a placed button in its action options.
