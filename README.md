# Visual Studio Code LiveBook Extension

![Screenshot](https://github.com/JonasGruenwald/code-livebook/blob/main/media/screenshot.png)

This is an extension that allows opening [Elixir LiveBook](https://livebook.dev/) files directly inside Visual Studio Code.

Please note that it is only embedding LiveBook in a Webview, so all vscode related functionality like the Copilot context and search will not be available.

It can however make the process of starting a LiveBook in the context of a vscode project a little bit quicker.

## Features

* Automatically starts a Livebook server when a `.livemd` file is opened in a vscode workspace
* The server is reused within the workspace when multiple livebooks are opened and shut down when all views close
* Can be configured to use an existing running livebook server
* Can be configured to attach notebooks to your running project
* Falls back to the default text editor for diff views
* 🦊 icon for `.livemd` files

## Setup

### When using Autostart (Default)

In order for the extension to automatically start Livebook when a `.livemd` file is opened, you **must intall the escripts version of Livebook** as described here:

https://github.com/livebook-dev/livebook?tab=readme-ov-file#escript

This means you must also have a working local Elixir setup with the required dependencies.

The extension will try to look for the livebook executable in `$HOME/.mix/escripts/livebook`

If the directory where Elixir keeps escripts is different on your system, please set the path the the livebook executable in the extension configuration `code-livebook.livebookExecutablePath`


##### Attach to your local runtime

You may want to automatically attach the opened notebook to your project's runtime, the extension provides a setting for the default runtime used by the server, you can set this in your local worspace config like so:

1. Start your elixir project as a node with a cookie

```bash
elixir --sname NODE --cookie COOKIE -S mix run --no-halt
```

2. At your workspace root create a `.vscode/settings.json` and set the relevant setting there


```json
{
  "code-livebook.livebookRuntime": "attached:NODE:COOKIE"
}
```

When you open a livebook in your workspace and your node is running, the livebook should connect to your node

### When using your own livebook server

In order to use your own livebook server:

* Make sure that you have `LIVEBOOK_WITHIN_IFRAME` set to true for your server
* Make sure that you have `LIVEBOOK_TOKEN_ENABLED` set to false for your server
* Make sure to set the host and port of your livebook server in the extension settings, and disable the setting to autostart the livebook server

See: https://hexdocs.pm/livebook/readme.html#environment-variables


## Thoughts / Issues
* You can navigate away from the openend notebook within the webview. There is nothing that can be done to stop this from the extension host
* Generally this extension is a bit counter to how vscode editors are supposed to work, but I think there is currently not a better way to do this, since [livebook doesn't really support editing its datamodel from another editor](https://elixirforum.com/t/livebook-inside-regular-editor/55581/7) 
* I could imagine a more ambitious version of this extension, along with a LiveBook integration which communicates with the extension host through messaging on the webview to enable more of an integrated experience, including Copilot Chat context etc. – I don't have time to do this but maybe someone else has

## Develop / Contribute 

Please feel free to contribute features / fixes if you would like to.

The extension is set up with the default yeoman template, no bundler is used, just tsc. 