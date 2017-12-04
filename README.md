[![Build Status](https://travis-ci.org/mikehall314/electron-comlink.svg?branch=master)](https://travis-ci.org/mikehall314/electron-comlink)

# electron-comlink
An adapter to allow Electron to use [Comlink](https://github.com/GoogleChromeLabs/comlink) to communicate between the background and renderer processes.

# Installation
```npm install electron-comlink```

# Usage
## Communicate from the background to the renderer
```js
// In the renderer process
const {Comlink} = require("comlinkjs");
const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(window);

const exposed = {
    doSomething() {
        return "Did something in the renderer";
    }
};

Comlink.expose(exposed, endpoint);
```
```js
// In the background process
const {BrowserWindow} = require("electron");
const win = new BrowserWindow({width: 800, height: 600});

// .. configure your window ...

const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(win);
ElectronMessageAdapter.patchMessagePort(global); // Required because Comlink expects the MessagePort global to exist

const {Comlink} = require("comlinkjs");
const link = Comlink.proxy(endpoint);
await link.doSomething(); // Returns "Did something in the renderer"
```

## Communicate from the renderer to the background
```js
// In the background process
const {BrowserWindow} = require("electron");
const win = new BrowserWindow({width: 800, height: 600});

// .. configure your window ...

const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(win);
ElectronMessageAdapter.patchMessagePort(global);

const exposed = {
    doSomethingElse() {
        return "Did something in the background";
    }
};

const {Comlink} = require("comlinkjs");
Comlink.expose(exposed, endpoint);
```
```js
// In the renderer process
const {Comlink} = require("comlinkjs");
const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(window);

const link = Comlink.proxy(endpoint);
await link.doSomethingElse(); // Returns "Did something in the background"
```

# Gotchas
Comlink currently expects `MessagePort` to be available on the global object, which is not the case in Electron's
background process. This means we have to patch `MessagePort` on to `global`, *before* loading Comlink, by calling
`ElectronMessageAdapter.patchMessagePort(global);`. If you load Comlink before patching `MessagePort` then Electron
will crash.

# Known Bugs
* The `transferList` argument to `.postMessage()` is not currently supported as, AFAIK, Electron lacks this mechanism.
