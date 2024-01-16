// import * as dotenv from 'dotenv';
// dotenv.config();

// let DEBUG = process.env.DEBUG || "true"

let DEBUG = "false";

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
