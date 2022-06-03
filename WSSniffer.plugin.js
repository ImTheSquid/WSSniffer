/**
 * @name WSSniffer
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/

module.exports = (() => {
    const config = {"info":{"name":"WSSniffer","authors":[{"name":"ImTheSquid","discord_id":"262055523896131584","github_username":"ImTheSquid","twitter_username":"ImTheSquid11"}],"version":"0.0.1","description":"*sniffs you, inhaling your essence deeply* ohhh yeahhh give me them bits and bytes"},"main":"index.js"};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Library) => {
    "use strict";

    const {Logger, Patcher, WebpackModules} = Library;

    const Packer = WebpackModules.getModule(m => m.prototype?.hasOwnProperty("unpack")).prototype;
    const userMod = BdApi.findModuleByProps("getCurrentUser");

    function concatTypedArrays(a, b) { // a, b TypedArray of same type
        var c = new (a.constructor)(a.length + b.length);
        c.set(a, 0);
        c.set(b, a.length);
        return c;
    }

    function equal(buf1, buf2)
    {
        if (buf1.byteLength != buf2.byteLength) return false;
        var dv1 = new Int8Array(buf1);
        var dv2 = new Int8Array(buf2);
        for (var i = 0 ; i != buf1.byteLength ; i++)
        {
            if (dv1[i] != dv2[i]) return false;
        }
        return true;
    }

    return class WSSniffer extends Plugin {
        constructor() {
            super();
            this.wsOnMessage = this.wsOnMessage.bind(this);
            this.currentRecvBuffer = new Uint8Array();
        }

        onStart() {
            this._onmessage = null;
            this._ws = null;

            Patcher.before(WebSocket.prototype, "send", (that, [arg]) => {
                // Lock log to just video stream
                if (typeof(arg) !== "string" || !that.url.includes("discord") || (this._ws && this._ws !== that)) return;

                const json = JSON.parse(arg);

                console.log("%cWS SEND FRAME ================================", "color: green; font-size: large; margin-top: 20px;");

                // Check if stream has started, if so then hook onmessage
                if (json.op === 0 && json.d.streams.length > 0 && json.d.streams[0].type === "screen" && json.d.user_id === userMod.getCurrentUser().id) {
                    console.log("%cSTREAM STARTED! Locking log to this stream only...", "font-size: xx-large;");
                    if (this._ws) {
                        this.resetVars();
                    }
                    this._ws = that;
                    this._onmessage = that.onmessage;
                    that.onmessage = this.wsOnMessage;
                } else if (json.op === 12 && json.d.video_ssrc !== 0 && json.d.rtx_ssrc !== 0) {
                    console.log("%cRECEIVED SSRC INFORMATION", "color: aqua; font-size: xx-large;");
                    Logger.log("Video SSRC:");
                    Logger.log(json.d.video_ssrc);
                    Logger.log("RTX SSRC:");
                    Logger.log(json.d.rtx_ssrc);
                }

                Logger.log(json);
                console.log("%cWS END SEND FRAME ============================", "color: green; font-size: large; margin-bottom: 20px;");
            });

            Patcher.before(WebSocket.prototype, "close", (that, [arg]) => {
                Logger.log("CLOSE!");
                Logger.log(that);
                Logger.log(arg);
                if (this._ws === that) {
                    console.log("%cSCREENSHARE CLOSED! Unlocking log...", "color: red; font-size: x-large;");
                    if (this._ws) {
                       this.resetVars();
                    }
                }
            });
        }

        resetVars() {
            this._ws.onmessage = this._onmessage;
            this._ws = null;
            this._onmessage = null;
        }

        wsOnMessage(m) {
            this._onmessage(m);

            const json = JSON.parse(m.data);

            console.log("%cWS RECV FRAME ================================", "color: orange; font-size: large; margin-top: 20px;");

            if (json.op === 4) {
                console.log("%cRECEIVED CODEC AND ENCRYPTION INFORMATION", "color: aqua; font-size: xx-large;");
                Logger.log("Audio Codec:");
                Logger.log(json.d.audio_codec);
                Logger.log("Encryption Mode:");
                Logger.log(json.d.mode);
                Logger.log("Secret key:");
                Logger.log(json.d.secret_key);
            }

            Logger.log(json);

            console.log("%cWS END RECV FRAME ============================", "color: orange; font-size: large; margin-bottom: 20px;");

            /*const ZLIB_SUFFIX = Uint8Array.from([0x00, 0x00, 0xff, 0xff]);

            Logger.log(m);
            this.currentRecvBuffer = concatTypedArrays(this.currentRecvBuffer, new Uint8Array(m.data));

            if (m.data.byteLength >= 4 && equal(new Uint8Array(m.data.slice(-4)), ZLIB_SUFFIX)) {
                console.log("%cWS RECV FRAME ================================", "color: orange; font-size: large; margin-top: 20px;");
                //Logger.log(Packer.unpack(m.data));
                try {
                    // Packer.unpack(concatTypedArrays(Uint8Array.from([131]), this.currentRecvBuffer).buffer);
                } catch (e) {
                    console.log(`%cFailed to unpack: ${e}`, "color: red");
                }
                this.currentRecvBuffer = new Uint8Array();
                console.log("%cWS END RECV FRAME ============================", "color: orange; font-size: large; margin-bottom: 20px;");
            }*/
        }

        onStop() {
            if (this._ws) {
                this.resetVars();
            }
            Patcher.unpatchAll();
        }
    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/