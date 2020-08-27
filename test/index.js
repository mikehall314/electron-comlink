/**
 * electron-comlink
 * An adapter to allow Electron IPC to use Comlink by @DasSurma
 */

"use strict";

/**
 * Test Suite
 * Stubs and mocks bits of electron to test the ElectronMessageAdapter
 *
 * @author Mike Hall <mikehall314@gmail.com>
 * @copyright 2017 Mike Hall
 * @license MIT
 */

// Tape for testing, sinon for spying
const test = require("tape");
const sinon = require("sinon");

// Load the library under test
const {ElectronMessageAdapter} = require("..");

// Fake enough of the electron API for us to test
class BrowserWindow {
    constructor() {
        this.webContents = {
            send: sinon.spy(),
        };
    }
}

const electron = {
    ipcMain: {
        on: sinon.spy(),
        removeListener: sinon.spy(),
    },
    ipcRenderer: {
        on: sinon.spy(),
        removeListener: sinon.spy(),
        send: sinon.spy(),
    },
};

// Create enough of the browser API to detect Electron through the userAgent
const window = {
    navigator: {
        userAgent: "Electron",
    },
};

// Tests start here
test("detect running in the background context", assert => {
    assert.plan(2);

    const mainWindow = new BrowserWindow();
    const endpoint = new ElectronMessageAdapter(mainWindow, electron.ipcMain);

    assert.same(
        endpoint.outbound,
        mainWindow.webContents,
        "Outbound message channel is webContents"
    );

    assert.same(
        endpoint.inbound,
        electron.ipcMain,
        "Inbound message channel is ipcMain"
    );

    assert.end();
});

test("detect running in the renderer context", assert => {
    assert.plan(2);

    const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

    assert.same(
        endpoint.outbound,
        electron.ipcRenderer,
        "Outbound message channel is ipcRenderer"
    );

    assert.same(
        endpoint.inbound,
        electron.ipcRenderer,
        "Inbound message channel is ipcRenderer"
    );

    assert.end();
});

test("detect running in a non-electron context", assert => {
    assert.plan(1);

    const expect = "Cannot create adapter outside of an Electron context";
    assert.throws(
        _ => new ElectronMessageAdapter(),
        expect,
        "Throws for non-Electron context"
    );

    assert.end();
});

test("adding event listeners, background context", assert => {
    assert.plan(7);

    // Create a little fake function to test
    // eslint-disable-next-line
    const fn = _ => {};

    // Init the message adapter
    const win = new BrowserWindow();
    const endpoint = new ElectronMessageAdapter(win, electron.ipcMain);

    // Add a listener and check the on method was called as expected
    endpoint.addEventListener("message", fn);
    assert.ok(endpoint.listeners.has(fn), "Listener exists");
    assert.ok(electron.ipcMain.on.calledOnce, "on method called exactly once");
    assert.ok(
        electron.ipcMain.on.calledWith("electron-comlink--message"),
        "on method args match"
    );

    // Remove the listener and check the removeMethod was called as expected
    endpoint.removeEventListener("message", fn);
    assert.false(endpoint.listeners.has(fn), "Listener was cleaned up");
    assert.ok(
        electron.ipcMain.removeListener.calledOnce,
        "remove method called exactly once"
    );
    assert.ok(
        electron.ipcMain.removeListener.calledWith("electron-comlink--message"),
        "remove method args match"
    );

    // Calling remove a second time should be ignored
    endpoint.removeEventListener("message", fn);
    assert.ok(
        electron.ipcMain.removeListener.calledOnce,
        "remove method still called exactly once"
    );

    // Clean up
    electron.ipcMain.on.resetHistory();
    electron.ipcMain.removeListener.resetHistory();
    assert.end();
});

test("sending message, background context", assert => {
    assert.plan(1);

    const win = new BrowserWindow();
    const endpoint = new ElectronMessageAdapter(win, electron.ipcMain);

    endpoint.postMessage("a message");
    const messageWasSent = win.webContents.send.calledWith(
        "electron-comlink--message",
        "a message"
    );
    assert.ok(messageWasSent, "send method called ok");

    win.webContents.send.resetHistory();
    assert.end();
});

test("adding event listeners, renderer context", assert => {
    assert.plan(7);

    // Create a little fake function to test
    // eslint-disable-next-line
    const fn = _ => {};

    const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

    // Add a listener and check its bound to the right context
    endpoint.addEventListener("message", fn);
    assert.ok(endpoint.listeners.has(fn), "Listener exists");
    assert.ok(
        electron.ipcRenderer.on.calledOnce,
        "on method called exactly once"
    );
    assert.ok(
        electron.ipcRenderer.on.calledWith("electron-comlink--message"),
        "on method args match"
    );

    // Remove a listener and check it unbinds
    endpoint.removeEventListener("message", fn);
    assert.false(endpoint.listeners.has(fn), "Listener was cleaned up");
    assert.ok(
        electron.ipcRenderer.removeListener.calledOnce,
        "remove method called exactly once"
    );
    assert.ok(
        electron.ipcRenderer.removeListener.calledWith(
            "electron-comlink--message"
        ),
        "remove method args match"
    );

    // Removing the listener again should be ignored
    endpoint.removeEventListener("message", fn);
    assert.ok(
        electron.ipcRenderer.removeListener.calledOnce,
        "remove method still called exactly once"
    );

    // Clean up
    electron.ipcRenderer.on.resetHistory();
    electron.ipcRenderer.removeListener.resetHistory();
    assert.end();
});

test("sending message, renderer context", assert => {
    assert.plan(1);

    const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

    endpoint.postMessage("a message");
    const messageWasSent = electron.ipcRenderer.send.calledWith(
        "electron-comlink--message",
        "a message"
    );
    assert.ok(messageWasSent, "send method called ok");

    electron.ipcRenderer.send.resetHistory();
    assert.end();
});

test("catch attempted transferList", assert => {
    assert.plan(2);

    const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

    // Empty transfer list is okay
    endpoint.postMessage("a message", []);
    const messageWasSent = electron.ipcRenderer.send.calledWith(
        "electron-comlink--message",
        "a message"
    );
    assert.ok(messageWasSent, "Empty transferList is ok");

    // Transferring a value should throw
    const buf = new ArrayBuffer(0);
    const expect = "transferList is not supported";
    assert.throws(
        _ => endpoint.postMessage("another message", [buf]),
        expect,
        "Catch attempts to transfer value"
    );

    // Clean up
    electron.ipcRenderer.send.resetHistory();
    assert.end();
});

test("wrappers call inner function", assert => {
    assert.plan(3);

    const endpoint = new ElectronMessageAdapter(window, electron.ipcRenderer);

    const fn = sinon.spy();

    // Test the wrapped function was created
    endpoint.addEventListener("message", fn);
    assert.ok(endpoint.listeners.has(fn), "wrapped function exists");

    // Call the wrapper, which should call the inner function
    const wrapped = endpoint.listeners.get(fn);
    wrapped({}, {foo: "bar"});

    // Check the inner function was called in the expected way
    assert.ok(fn.calledOnce, "Inner function called exactly once");
    assert.ok(
        fn.calledWith({data: {foo: "bar"}}),
        "Second argument is mapped to data property"
    );

    assert.end();
});
