import { around } from "monkey-around"
import CST from "./main"
import { Workspace } from "obsidian"


export function getLeafWrapper(plugin: CST) {
    const getLeafPatched = around(Workspace.prototype, {
        //@ts-ignore
        getLeaf(old) {
            return function (...args: any[]) {
                console.log("getLeafWrapper")
                if (!plugin.settings.switch) {
                    return old.apply(this, args);
                }
                console.log("args", args)
                return old.apply(this, args)
                // atempted to get El still explorer
            }
        }
    })
    return getLeafPatched
}