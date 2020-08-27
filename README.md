[![Build Status](https://travis-ci.org/mikehall314/electron-comlink.svg?branch=master)](https://travis-ci.org/mikehall314/electron-comlink)

# electron-comlink

An adapter to allow Electron to use [Comlink](https://github.com/GoogleChromeLabs/comlink) to communicate between the background and renderer processes.

# Installation

`npm install electron-comlink`

# Usage

## Communicate from the background to the renderer

```js
// In the renderer process
const Comlink = require("comlink");
const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

const exposed = {
    doSomething() {
        return "Did something in the renderer";
    },
};

Comlink.expose(exposed, endpoint);
```

```js
// In the background process
const Comlink = require("comlink");
const {ElectronMessageAdapter} = require("electron-comlink");

const win = new BrowserWindow({width: 800, height: 600});
const endpoint = new ElectronMessageAdapter(win, electron.ipcMain);

const link = Comlink.wrap(endpoint);
await link.doSomething(); // Returns "Did something in the renderer"
```

## Communicate from the renderer to the background

```js
// In the background process
const Comlink = require("comlink");
const {ElectronMessageAdapter} = require("electron-comlink");

const win = new BrowserWindow({width: 800, height: 600});
const endpoint = new ElectronMessageAdapter(win, electron.ipcMain);

const exposed = {
    doSomethingElse() {
        return "Did something in the background";
    },
};

Comlink.expose(exposed, endpoint);
```

```js
// In the renderer process
const Comlink = require("comlink");
const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

const link = Comlink.wrap(endpoint);
await link.doSomethingElse(); // Returns "Did something in the background"
```

# Gotchas

-   The `transferList` argument to `.postMessage()` is not currently supported.
-   If you try to message the renderer before it has started up, then you could
    be `await`ing forever
