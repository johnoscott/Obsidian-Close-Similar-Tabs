// import * as dotenv from 'dotenv';
// dotenv.config();

import { Platform } from "obsidian";

let DEBUG = "false";

if (Platform.isDesktopApp){
    DEBUG = process.env.DEBUG || "true"
}

export const Console = {
    debug: (...args: any[]) => {
        if (DEBUG.trim().toLowerCase() === "true") {
            console.debug(...args);
        }
    },
    log: (...args: any[]) => {
        if (DEBUG.trim().toLowerCase() === "true") {
            console.log(...args);
        }
    }
};
