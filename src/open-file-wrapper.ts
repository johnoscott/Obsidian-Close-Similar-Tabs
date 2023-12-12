// https://github.com/aidan-gibson/obsidian-opener/blob/b80b0ea088c3ab94c571d5a1fdd0244a9adadce4/main.ts#L198
import { around } from "monkey-around";
import type CST from "./main";
import { Workspace, WorkspaceLeaf } from "obsidian";
import { Console } from "./constantes";


// todo: to pinned tab / links more tests

export function openFileWrapper(plugin: CST) {
    const openFilePatched = around(WorkspaceLeaf.prototype, {
        //@ts-ignore
        openFile(old) {
            return async function (...args) {
                // Console.debug("first args:", ...args);// file + object: active, state { mode: 'source', file: '2023-12-06.md' }
                /* state → {active: false}
                active: true when drag&drop on a tab,
                active: false when drag/insert a new tab
                undefined no drag */
                if (!plugin.settings.switch || plugin.link) {
                    return old.apply(this, args);
                }

                Console.debug("Open File");
                const [file, state] = args;
                // Console.debug("args", args)
                Console.debug("state", state)
                const activeLeaf = plugin.getVisibleLeaf()
                // plugin.activeLeafInfo()
                const target = file.path

                if (activeLeaf?.getDisplayText() === "Files") {
                    Console.debug("EXPLORER")
                    const activeLeaf = plugin.app.workspace.getMostRecentLeaf()
                    Console.log("activeLeaf", activeLeaf?.getDisplayText())
                    const { empties, duplis } = init(activeLeaf!, args, plugin)

                    if (!duplis) {
                        Console.debug("normal pinned")
                        const result = old.apply(this, args)
                        return result
                    }

                    Console.debug("duplis")
                    if (plugin.ctrl) {//on existing tab+ ctrl
                        Console.debug("ctrl")
                        Console.debug("empties.length", empties.length)
                        empties.pop()?.detach()
                    } else { // drag/insert
                        if (state?.active === false) { //ok
                            Console.debug("drag/insert")
                            activateLeaf(plugin, duplis, 0)
                            empties.pop()?.detach()
                        } else {//on existing tab or new window
                            Console.debug("drag on existing tab or popout")
                            if (plugin.getLeafPath(activeLeaf!) !== target && !plugin.getPinned(duplis))//don't close actual leaf as dupli
                            {
                                Console.log("detach")
                                await activateLeaf(plugin, duplis, 0)
                                activeLeaf!.detach()
                            } else {
                                Console.log("normal")
                                return old.apply(this, args)
                            }
                            // if (plugin.getPinned(duplis)) {
                            //         Console.log("activepinned")
                            //     }
                        }
                    }
                } else if (state?.active === true) { // NOT EXPLORER
                    const activeLeaf = plugin.app.workspace.getLeaf()
                    Console.debug("quickswith or drag on tab header")
                    const { empties, duplis } = init(activeLeaf, args, plugin)

                    if (duplis) {
                        Console.debug("duplis")
                        setTimeout(() => {
                            plugin.app.workspace.setActiveLeaf(duplis, { focus: true })
                        }, 0);
                        if (plugin.ctrl) {// quick switch ctrl
                            Console.debug("quick switch ctrl")
                            empties.pop()?.detach()
                        }
                        else {// quick switch
                            Console.debug("quick switch or drag header or today note")
                            if (plugin.getLeafPath(activeLeaf) !== target) activeLeaf.detach()
                        }
                    } else { // today note no existing tab
                        Console.debug("// today note no existing tab")
                        return old.apply(this, args)
                    }
                } else if (state?.active === false) {// draggin/insert
                    const { empties, duplis, activeEl } = init(activeLeaf, args, plugin)
                    const isMainWindow = activeLeaf?.view.containerEl.win === window;
                    if (isMainWindow) {
                        empties?.pop()?.detach()
                    } else { // drag on other window
                        Console.log("drag on other window")
                        if (duplis) {
                            if (!plugin.getPinned(duplis)) {
                                console.log("not pinned")
                                await activateLeaf(plugin,duplis,0)
                                await removeEmpty(plugin, activeEl, 0);// back into the future ...
                            } else {
                                Console.log("pinned")
                                return old.apply(this, args)
                            }
                        } else {
                            return old.apply(this, args)
                        }
                    }
                    await activateLeaf(plugin, duplis, 0)
                } else {// open window normal
                    console.log("open window normal")
                    return old.apply(this, args)
                }
            };
        },
    });
    return openFilePatched;
}

function init(activeLeaf: WorkspaceLeaf | undefined, args: any, plugin: CST) {
    const [file, state] = args;
    const target = file.path
    const {
        activeEl,
        leaves,
        empties,
        isTherePin
    } = getConditions(plugin, activeLeaf)
    const duplis = leaves.filter(l => { return plugin.getLeafPath(l) === target })[0]
    Console.debug("duplis.length", leaves.filter(l => { return plugin.getLeafPath(l) === target }).length)
    Console.debug("leaves.length", leaves.length)
    Console.debug("empties.length", empties.length)
    return {
        activeEl,
        leaves,
        empties,
        isTherePin,
        duplis
    }
}

function removeEmpty(plugin: CST, activeEl: HTMLElement | null, timeout: number): Promise<void> {
    return delayedPromise<void>(timeout, () => {
        const { empties } = plugin.getLeaves(activeEl as HTMLElement)
        Console.debug("Detaching leaf");
        empties?.pop()?.detach();
    });
}

// function activateTimeout(plugin: CST, leaf: WorkspaceLeaf, timeout: number) {
//     console.log(" activateTimeout leaf", leaf.getDisplayText)
//     setTimeout(() => {
//         plugin.app.workspace.setActiveLeaf(leaf, { focus: true })
//     }, timeout);
// }

function activateLeaf(plugin: CST, leaf: WorkspaceLeaf, timeout: number): Promise<void> {
    return delayedPromise<void>(timeout, () => {
        Console.debug("activating leaf")
        plugin.app.workspace.setActiveLeaf(leaf, { focus: true })
    });
}

function delayedPromise<T>(timeout: number, callback: () => T): Promise<T> {
    return new Promise<T>((resolve) => {
        setTimeout(() => {
            const result = callback();
            resolve(result);
        }, timeout);
    });
}

function getConditions(plugin: CST, activeLeaf: WorkspaceLeaf | undefined): { activeLeaf: WorkspaceLeaf | undefined, activeEl: HTMLElement, leaves: WorkspaceLeaf[], empties: WorkspaceLeaf[], isTherePin: boolean } {
    const { el: activeEl } = plugin.getLeafProperties(activeLeaf);
    // const lastActiveContainer = this.app.workspace.activeTabGroup.containerEl
    const { leaves, empties, isTherePin } = plugin.getLeaves(activeEl!);
    return { activeLeaf, activeEl, leaves, empties, isTherePin }
}