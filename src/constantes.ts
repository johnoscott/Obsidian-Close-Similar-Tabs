import { CSTSettings } from "obsidian";

export const DEFAULT_SETTINGS: CSTSettings = {
    byWindow: "current",
    switch: true,
};

function getEnv(name: string) {
    let val = process.env[name];
    return val?.trim() ?? "";
}

const DEBUG_ACTIVATED = getEnv("DEBUG_ACTIVATED")
const FORCED_DEBUG_METHOD = getEnv("FORCED_DEBUG_METHOD")


export const Console = {
    debug: (...args: any[]) => {
        if (DEBUG_ACTIVATED) {
            if (FORCED_DEBUG_METHOD.toLowerCase() === "log") console.log(...args)
            else console.debug(...args);
        }
    },
    log: (...args: any[]) => {
        if (DEBUG_ACTIVATED) {
            if (FORCED_DEBUG_METHOD.trim().toLowerCase() === "debug") console.debug(...args)
            else console.log(...args);
        }
    }
};