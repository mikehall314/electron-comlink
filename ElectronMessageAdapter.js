/**
 * electron-comlink
 * An adapter to allow Electron IPC to use Comlink by @DasSurma
 */

/**
 * ElectronMessageAdapter
 * A class which wraps Electron's IPC features in a Comlink-compatible API
 *
 * @author Mike Hall <mikehall314@gmail.com>
 * @copyright 2017 Mike Hall
 * @license MIT
 */
class ElectronMessageAdapter {

    /**
     * PREFIX()
     * Return a prefix we use on the IPC channel, so we don't accidentally
     * interfere with some other IPC the user might be doing.
     *
     * @static
     * @return string
     */
    static get PREFIX() {
        return "electron-comlink--";
    }

    /**
     * Class Constructor
     * Builds an electron message adapter from the passed window.
     *
     * @constructor
     * @param {*} window A window object to wrap. This should be an instance of BrowserWindow if we are
     *      running n the background, or just the window object if we are running in the renderer.
     * @param {object} electron (optional) an instance of electron. You usually don't need to pass this.
     */
    constructor(window, electron) {

        // If we have been supplied with an instance of electron, then we can
        // use it here. This is most likely going to be used for stubbing; in the
        // normal course of things you shouldn't need to pass this in.
        electron = electron || require("electron");
        Object.defineProperty(this, "electron", {value: electron, writable: false, enumerable: false});

        // We have to wrap supplied event listeners to conform their API to
        // something Comlink can accept, but we also need be able to unbind these
        // listeners when Comlink asks us to. However, Comlink will be supplying
        // it's original function object to us, not our wrapped version. So we
        // need to be able to retrieve the wrapped function, when supplied with
        // the original function -- which means a Map() is ideal for what we need!
        // The key will be the function object supplied by Comlink. The value
        // will be our wrapped function. This means that when Comlink supplies the
        // original function object to `removeEventListener()`, we can easily fetch
        // our wrapped version from the Map and unbind it.
        Object.defineProperty(this, "listeners", {value: new Map(), writable: false});

        // If the developer has passed us an instance of BrowserWindow, then we are
        // creating an adapter which lives in the Node background process and sends
        // messages to this window. The message target is therefore `window.webContents`,
        // and we will be calling `postMessage` on that. The IPC channel we our bind
        // listeners to is going to be `electron.ipcMain`
        if (this.targetIsElectronWindow(window)) {
            this.target = window.webContents;
            this.channel = electron.ipcMain;
            return;
        }

        // If it looks like we are running in a renderer context, then we are creating an
        // adapter which sends messages to the background process. In this case, the message
        // target and the IPC channel are in-fact the same object, which is `electron.ipcRenderer`.
        // We do our `postMessage` calls and bind our event listeners on this object
        if (this.targetIsBackgroundProcess(window)) {
            this.channel = this.target = electron.ipcRenderer;
            return;
        }

        // If neither of these things is true, then we're running somewhere we don't
        // expect, or I'm an idiot who has screwed up the detection code. Blah. Let's
        // assume the "not an idiot" case for now.
        throw new Error("Cannot create adapter outside of an Electron context");
    }

    /**
     * targetIsElectronWindow()
     * Detects if we are trying to communicate with an electron BrowserWindow
     *
     * @param {object} w
     * @return {*} truthy if this is an electron BrowserWindow
     */
    targetIsElectronWindow(w) {
        return typeof w === "object" && this.electron.BrowserWindow && w instanceof this.electron.BrowserWindow;
    }

    /**
     * targetIsBackgroundProcess()
     * Detects if we are trying to communicate with the electron background process
     *
     * @param {object} w
     * @return {*} truthy if this is an electron renderer window object
     */
    targetIsBackgroundProcess(window) {
        return window.navigator && window.navigator.userAgent.includes("Electron");
    }

    /**
     * addEventListener()
     * Bind an event listener to the IPC channel
     *
     * @param {string} channel The name of the channel
     * @param {function} fn The function object to bind
     */
    addEventListener(channel, fn) {

        // If we don't already have this listener on the map, then create a new entry
        // We also need to attach the `data` value to the event, because that's where
        // Comlink expects to find it.
        if (this.listeners.has(fn) === false) {
            this.listeners.set(fn, (evt, data) => {
                return fn(Object.assign(evt, {data}));
            });
        }

        // Bind the listener to the IPC channel, while trying to play nice with other
        // software which might be trying to use this channel
        this.channel.on(ElectronMessageAdapter.PREFIX + channel, this.listeners.get(fn));
    }

    /**
     * removeEventListener()
     * Unbind an event listener from the IPC channel
     *
     * @param {string} channel The name of the channel
     * @param {function} fn The function object to unbind
     */
    removeEventListener(channel, fn) {

        // If we have not bound this function, or have already unbound it, then
        // it will not exist on our Map and we can just ignore this message
        if (this.listeners.has(fn) === false) {
            return;
        }

        // Fetch the wrapped function from the Map and unbind it, then clean up the Map
        // I suppose this could break if the same function object was bound to two
        // different channel names? Something to think about!
        this.channel.removeListener(ElectronMessageAdapter.PREFIX + channel, this.listeners.get(fn));
        this.listeners.delete(fn);
    }

    /**
     * postMessage()
     * Sends a message from one process to another
     *
     * @param {object} message - The message to send
     * @param {array} transferList - Not supported on Electron :(
     */
    postMessage(message, transferList) {

        // The `transferList` parameter things like ArrayBuffers to be
        // passed between contexts, with a transfer of ownership and everything.
        // This is probably better than serializing and sending as a massive string,
        // but I don't think Electron has this, so if the user is trying to leverage
        // this feature then we can only tell them know. Unless you know better..?
        if (transferList && transferList.length > 0) {
            throw new Error("transferList is not supported");
        }

        // Send the message to the target
        this.target.send(ElectronMessageAdapter.PREFIX + "message", message);
    }
}

// Export the API, all ready to use
Object.assign(module.exports, {ElectronMessageAdapter});
