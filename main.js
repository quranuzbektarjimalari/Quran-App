const {app, BrowserWindow, Menu, protocol, net, dialog} = require("electron");
const path = require("path");
const fs = require("fs");
const {pathToFileURL} = require("url");

const APP_DIR = path.join(__dirname, "app");
let mainWindow = null;
let mediaDir = null;

// app:// protokoli: HTML fayllar app/ papkadan, rasm va audio esa media papkadan olinadi
protocol.registerSchemesAsPrivileged([{
    scheme: "app",
    privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true}
}]);

// ---------- Media papkani topish (images, audios1, audios2) ----------
const configPath = () => path.join(app.getPath("userData"), "config.json");

function readConfig() {
    try {return JSON.parse(fs.readFileSync(configPath(), "utf8"));} catch {return {};}
}
function saveConfig(cfg) {
    try {
        fs.mkdirSync(path.dirname(configPath()), {recursive: true});
        fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2));
    } catch {}
}
function hasMedia(dir) {
    return !!dir && fs.existsSync(path.join(dir, "images", "001.jpg"));
}
function findMediaDir() {
    const cfg = readConfig();
    const candidates = [
        cfg.mediaDir,
        process.env.PORTABLE_EXECUTABLE_DIR && path.join(process.env.PORTABLE_EXECUTABLE_DIR, "media"),
        path.join(path.dirname(process.execPath), "media"),
        path.join(__dirname, "media"),
        path.join(app.getPath("userData"), "media")
    ];
    return candidates.find(hasMedia) || null;
}
function askMediaDir() {
    dialog.showMessageBoxSync({
        type: "info",
        title: "Qur'on tilovati",
        message: "Rasm va audio fayllar papkasini tanlang",
        detail: "Tanlanadigan papka ichida images, audios1 va audios2 papkalari bo'lishi kerak."
    });
    const res = dialog.showOpenDialogSync({properties: ["openDirectory"], title: "Media papkasini tanlang"});
    if (res && res[0]) {
        const dir = res[0];
        if (hasMedia(dir)) {
            saveConfig({...readConfig(), mediaDir: dir});
            return dir;
        }
        dialog.showErrorBox("Papka noto'g'ri", "Tanlangan papkada images/001.jpg topilmadi.");
    }
    return null;
}

// ---------- Oyna ----------
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 560,
        title: "Qur'on tilovati",
        backgroundColor: "#e6e1d6",
        autoHideMenuBar: true,
        icon: path.join(__dirname, "build", "icon.ico"),
        show: false,
        webPreferences: {
            autoplayPolicy: "no-user-gesture-required",
            spellcheck: false,
            devTools: !app.isPackaged
        }
    });

    mainWindow.once("ready-to-show", () => mainWindow.show());
    mainWindow.setTitle("Qur'on tilovati");
    mainWindow.on("page-title-updated", e => e.preventDefault());

    // "Развернуть" (maximize) tugmasi bosilsa, video pleyerlardagidek to'liq ekranga o'tadi
    mainWindow.on("maximize", () => {
        if (!mainWindow.isFullScreen()) mainWindow.setFullScreen(true);
    });
    // To'liq ekrandan chiqqanda oyna "maximize" holatida qolib ketmasligi uchun oddiy holatga qaytaramiz
    mainWindow.on("leave-full-screen", () => {
        setTimeout(() => {
            if (mainWindow && mainWindow.isMaximized()) mainWindow.unmaximize();
        }, 60);
    });

    // Klaviatura: F11 - to'liq ekran, Esc - to'liq ekrandan chiqish, Ctrl+O - media papkasi
    mainWindow.webContents.on("before-input-event", (event, input) => {
        if (input.type !== "keyDown") return;
        if (input.key === "F11") {
            event.preventDefault();
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        } else if (input.key === "Escape" && mainWindow.isFullScreen()) {
            event.preventDefault();
            mainWindow.setFullScreen(false);
        } else if (input.control && input.key.toLowerCase() === "o") {
            event.preventDefault();
            const dir = askMediaDir();
            if (dir) {
                mediaDir = dir;
                mainWindow.webContents.reloadIgnoringCache();
            }
        }
    });

    // Tashqi havolalar dastur ichida ochilmasin
    mainWindow.webContents.setWindowOpenHandler(() => ({action: "deny"}));
    mainWindow.webContents.on("will-navigate", (e, url) => {
        if (!url.startsWith("app://")) e.preventDefault();
    });

    mainWindow.loadURL("app://local/index.html");
    mainWindow.on("closed", () => {mainWindow = null;});
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(() => {
        Menu.setApplicationMenu(null);
        mediaDir = findMediaDir() || askMediaDir();

        protocol.handle("app", async (request) => {
            try {
                const url = new URL(request.url);
                let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
                const isMedia = /^(images|audios\d+)\//.test(rel);
                const base = isMedia ? mediaDir : APP_DIR;
                if (!base) return new Response("Media papkasi tanlanmagan", {status: 404});

                const full = path.normalize(path.join(base, rel));
                if (!full.startsWith(path.normalize(base + path.sep))) {
                    return new Response("Forbidden", {status: 403});
                }
                if (!fs.existsSync(full)) return new Response("Not found", {status: 404});

                return await net.fetch(pathToFileURL(full).toString(), {
                    headers: request.headers,
                    bypassCustomProtocolHandlers: true
                });
            } catch (err) {
                return new Response("Error: " + err.message, {status: 500});
            }
        });

        createWindow();
        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on("window-all-closed", () => app.quit());
}
