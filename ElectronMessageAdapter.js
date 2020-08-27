/**
 * electron-comlink
 * An adapter to allow Electron IPC to use Comlink by @DasSurma
 */

/**
 * MessageAdapter
 * A class which wraps Electron's IPC features in a Comlink-compatible API
 *
 * @author Mike Hall <mikehall314@gmail.com>
 * @copyright 2017-2020 Mike Hall
 * @license MIT
 */
class MessageAdapter {
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
     */
    constructor(targetWindow, ipcChannel) {
        // We have to wrap supplied event listeners to conform their API to
        // something Comlink can accept, but we also need be able to unbind
        // these listeners when Comlink asks us to. However, Comlink will be
        // supplying its original function object to us, not our wrapped
        // version. So we need to be able to retrieve the wrapped function,
        // when supplied with the original function - which implies a Map().
        // The key will be the function object supplied by Comlink. The value
        // will be our wrapped function. When Comlink supplies the original
        // function object to `removeEventListener()`, we can easily fetch the
        // wrapped version from the Map and unbind it.
        Object.defineProperty(this, "listeners", {
            value: new Map(),
            enumerable: false,
        });

        // If the window object we are passed is an instance of BrowserWindow,
        // then we know we are running in the background process and
        // communicating with the foreground process. In which case, the
        // we should be sending messages to targetWindow.webContents, and
        // and listening for messages on the IPC channel.
        if (MessageAdapter.isElectronBrowserWindow(targetWindow)) {
            this.outbound = targetWindow.webContents;
            this.inbound = ipcChannel;
            return;
        }

        // If the window object we are passed is an instance of the Chromium
        // window object, then we know we are running in the renderer process
        // and communicating with the background process. In which case, we are
        // both listening for messages from, and sending messages to, the IPC
        // channel.
        if (MessageAdapter.isChromiumWindow(targetWindow)) {
            this.outbound = ipcChannel;
            this.inbound = ipcChannel;
            return;
        }

        // If neither of these things is true, then we're running somewhere we
        // don't expect, or I'm an idiot who has screwed up the detection code.
        throw new Error("Cannot create adapter outside of an Electron context");
    }

    /**
     * isElectronBrowserWindow()
     * Detects if the passed object is an Electron BrowserWindow instance
     *
     * @param {object} w
     * @return {boolean}
     */
    static isElectronBrowserWindow(w) {
        return Boolean(
            w && w.constructor && w.constructor.name === "BrowserWindow"
        );
    }

    /**
     * isChromiumWindow()
     * Detects if the passed object is a Chromium window from the
     * Electron renderer
     *
     * @param {object} w
     * @return {boolean}
     */
    static isChromiumWindow(w) {
        return Boolean(
            w && w.navigator && w.navigator.userAgent.includes("Electron")
        );
    }

    /**
     * addEventListener()
     * Bind an event listener to the IPC channel
     *
     * @param {string} channel The name of the channel
     * @param {function} fn The function object to bind
     */
    addEventListener(channel, fn) {
        // If we don't already have this listener on the Map, then create a
        // new entry. We also need to attach the `data` value to the event,
        // because that's where Comlink expects to find it.
        if (this.listeners.has(fn) === false) {
            this.listeners.set(fn, (evt, data) => {
                fn(Object.assign(evt, {data}));
            });
        }

        // Bind the listener to the IPC channel, while trying to play nice
        // with other software which might be trying to use the IPC interface
        this.inbound.on(
            MessageAdapter.PREFIX + channel,
            this.listeners.get(fn)
        );
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

        // Fetch the wrapped function from the Map and unbind it, then clean
        // up the Map. I suppose this could break if the same function object
        // was bound to two different channel names? Something to think about!
        this.inbound.removeListener(
            MessageAdapter.PREFIX + channel,
            this.listeners.get(fn)
        );

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
        // The `transferList` parameter allows things like ArrayBuffers to be
        // passed between contexts, with a transfer of ownership and everything.
        // This is probably better than sending a massive serialized string,
        // but I don't think Electron has this feature. If the user is trying
        // to leverage the `transferList` then we can only tell them "no".
        // Unless you know better..?
        // In which case: https://github.com/mikehall314/electron-comlink
        if (transferList && transferList.length > 0) {
            throw new Error("transferList is not supported");
        }

        // Send the message
        this.outbound.send(MessageAdapter.PREFIX + "message", message);
    }
}

// Export the API, all ready to use
exports.ElectronMessageAdapter = MessageAdapter;
