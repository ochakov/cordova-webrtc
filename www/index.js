'use strict';

var channel = require('cordova/channel');
var exec = require('cordova/exec');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var channel__default = /*#__PURE__*/_interopDefaultLegacy(channel);
var exec__default = /*#__PURE__*/_interopDefaultLegacy(exec);

/// <reference types="cordova-plus/types" />
const SERVICE = "WebRTC";
const execAsync = (method, ...args) => new Promise((resolve, reject) => {
    exec__default["default"](resolve, reject, SERVICE, method, args);
});
class Agent {
    constructor() {
        this._isNegotiating = false;
        if (typeof(RTCPeerConnection) !== 'undefined') {
            const pc = new RTCPeerConnection({
                // @ts-expect-error
                sdpSemantics: "unified-plan",
            });
            this._pc = pc;
            pc.onconnectionstatechange = (event) => {
                switch (pc.connectionState) {
                                }
            };
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    await execAsync("agentCandidate", event.candidate);
                }
            };
            pc.onnegotiationneeded = () => {
            };
            pc.onsignalingstatechange = () => {
                if (pc.signalingState === "stable") {
                    this._isNegotiating = false;
                }
            };
            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    const stream = event.streams[0];
                    this._stream = stream;
                }
                else {
                    const inboundStream = new MediaStream();
                    inboundStream.addTrack(event.track);
                    this._stream = inboundStream;
                }
            };
        }
        this._unregisterEvents = this._registerEvents();
    }
    _registerEvents() {
        const onOffer = async (data) => {
            this._isNegotiating = true;
            await this._answer(data.offer);
        };
        document.addEventListener("webrtc.agent.offer", onOffer, false);
        const pc = this._pc;
        const onCandidate = (data) => {
            pc.addIceCandidate(data.candidate);
        };
        document.addEventListener("webrtc.agent.candidate", onCandidate, false);
        return () => {
            document.removeEventListener("webrtc.agent.offer", onOffer);
            document.removeEventListener("webrtc.agent.candidate", onCandidate);
        };
    }
    async getStream() {
        if (this._stream) {
            await this.toggleSend(true);
            return this._stream;
        }
        const streamPromise = new Promise((resolve) => {
            this._pc.addEventListener("track", (e) => {
                const stream = e.streams[0];
                resolve(stream);
            }, { once: true, passive: true });
        });
        await this.toggleSend(true);
        await execAsync("agentStart");
        this._stream = await streamPromise;
        return this._stream;
    }
    async addStream(stream) {
        const pc = this._pc;
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });
        await execAsync("agentStart");
    }
    async toggleSend(enable) {
        return execAsync("agentSend", enable);
    }
    async _answer(offer) {
        const pc = this._pc;
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await execAsync("agentAnswer", answer);
    }
    close() {
        this._unregisterEvents();
        this._pc.close();
    }
}
class WebRTCPlugin {
    constructor() {
        this.agent = new Agent();
    }
    configAudio(opts) {
        const category = opts.category
            ? `AVAudioSessionCategory${opts.category[0].toUpperCase()}${opts.category.substring(1)}`
            : undefined;
        const mode = opts.mode
            ? `AVAudioSessionMode${opts.mode[0].toUpperCase()}${opts.mode.substring(1)}`
            : undefined;
        if (opts.inputGain && opts.inputGain < 0) {
            throw new Error(`\`inputGain\` value should be positive: ${opts.inputGain}`);
        }
        return execAsync("configAudio", Object.assign(Object.assign({}, opts), { category, mode }));
    }
    async renewAgent() {
        await execAsync("renewAgent");
        this.agent.close();
        this.agent = new Agent();
    }
}
function onMessageFromNative(event) {
    if (!event || !event.type)
        return;
    cordova.fireDocumentEvent(`webrtc.${event.type}`, event.data);
}
const feature = "onWebRTCReady";
channel__default["default"].createSticky(feature);
channel__default["default"].waitForInitialization(feature);
channel__default["default"].onCordovaReady.subscribe(() => {
    exec__default["default"](onMessageFromNative, console.error, SERVICE, "ready", []);
    channel__default["default"].initializationComplete(feature);
});
var index = new WebRTCPlugin();

module.exports = index;
