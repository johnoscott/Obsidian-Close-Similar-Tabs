import { CSTSettings } from "obsidian";

export const DEFAULT_SETTINGS: CSTSettings = {
    byWindow: "current",
    switch: true,
};

export const Console = {
    debug: (...args: any[]) => {
        if ((global as any).DEBUG_ACTIVATED) {
            if ((global as any).FORCED_DEBUG_METHOD.trim().toLowerCase() === "log") console.log(...args)
            else console.debug(...args);
        }
    },
    log: (...args: any[]) => {
        if ((global as any).DEBUG_ACTIVATED) {
            if ((global as any).FORCED_DEBUG_METHOD.trim().toLowerCase() === "debug") console.debug(...args)
            else console.log(...args);
        }
    }
};