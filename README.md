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

const {Comlink} = require("comlinkjs");
const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(win);

const link = Comlink.proxy(endpoint);
await link.doSomething(); // Returns "Did something in the renderer"
```

## Communicate from the renderer to the background
```js
// In the background process
const {BrowserWindow} = require("electron");
const win = new BrowserWindow({width: 800, height: 600});

// .. configure your window ...

const {Comlink} = require("comlinkjs");
const {ElectronMessageAdapter} = require("electron-comlink");
const endpoint = new ElectronMessageAdapter(win);

const exposed = {
    doSomethingElse() {
        return "Did something in the background";
    }
};

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

# Known Bugs
Currently, this library doesn't work at all 😛 because `Comlink` is looking for `MessagePort` which doesn't exist in NodeJS. Hopefully that is something which we can fix!
