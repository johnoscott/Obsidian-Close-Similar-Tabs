openPopoutLeafWrapper

import { around } from "monkey-around"
import CST from "./main"
import { Workspace } from "obsidian"


export function openPopoutLeafWrapper(plugin: CST) {
    const openPopoutLeafPatched = around(Workspace.prototype, {
        //@ts-ignore
        openPopoutLeaf(old) {
            return function (...args: any[]) {
                console.log("openPopoutLeafWrapper")
                if (!plugin.settings.switch) {
                    return old.apply(this, args);
                }
                plugin.openPopout = true
                setTimeout(() => {
                    plugin.openPopout = false                    
                }, 400);
                return old.apply(this, args)
                // atempted to get El still explorer
            }
        }
    })
    return openPopoutLeafPatched
}