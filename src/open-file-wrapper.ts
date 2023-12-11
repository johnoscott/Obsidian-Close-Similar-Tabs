// https://github.com/aidan-gibson/obsidian-opener/blob/b80b0ea088c3ab94c571d5a1fdd0244a9adadce4/main.ts#L198
import { around } from "monkey-around";
import type CST from "./main";
import { WorkspaceLeaf } from "obsidian";
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
                Console.debug("args", args)
                Console.debug("state", state)
                const activeLeaf = plugin.getActiveLeaf()
                Console.debug("activeLeaf.getDisplayText() ", activeLeaf.getDisplayText())
                const target = file.path

                if (activeLeaf.getDisplayText() === "Files") {
                    Console.debug("EXPLORER")
                    const activeLeaf = app.workspace.getLeaf()// still check what active leaf works
                    Console.debug("app.workspace.getLeaf()", activeLeaf.getDisplayText())
                    const { empties, leafExists } = init(activeLeaf, args, plugin)
                    if (leafExists) {
                        Console.debug("leafExists")
                        setTimeout(() => {
                            app.workspace.setActiveLeaf(leafExists, { focus: true })
                        }, 0);
                        if (plugin.ctrl) {//on existing tab+ ctrl
                            Console.debug("ctrl")
                            Console.debug("empties.length", empties.length)
                            empties.pop()?.detach()
                        } else {
                            if (state?.active === false) {
                                Console.debug("drag/insert")
                                empties.pop()?.detach()
                                // if activeLeaf pinned and drag/insert after this tab. 2 empties are added. extremely rare situation that is impossible to fix event using monly after. I can add a settings to have always 1 empty tab per active container. it will add only 1 empty max. 
                            } else {//on existing tab or new window
                                Console.debug("ici")
                                if (plugin.getLeafPath(activeLeaf) !== target)//don't close actual leaf as dupli
                                    activeLeaf.detach()
                                else return old.apply(this, args)
                            }
                        }
                    } else {
                        Console.debug("return old")
                        return old.apply(this, args)
                    }

                } else if (state?.active === true) {
                    const activeLeaf = app.workspace.getLeaf()
                    Console.debug("quickswith or drag on tab header")
                    const { empties, leafExists } = init(activeLeaf, args, plugin)

                    if (leafExists) {
                        Console.debug("leafExists")
                        setTimeout(() => {
                            app.workspace.setActiveLeaf(leafExists, { focus: true })
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
                    const {empties,leafExists,activeEl} =init(activeLeaf,args,plugin)
                    const isMainWindow = activeLeaf?.view.containerEl.win === window;
                    if (isMainWindow) {
                        empties?.pop()?.detach()
                    } else { // drag on other window
                        if(leafExists){
                            await removeEmpty(plugin,activeEl,20);// back into the future ...
                        }else{
                            return old.apply(this, args)
                        }
                    }
                    await activateLeaf(leafExists,0)
                }
            };
        },
    });
    return openFilePatched;
}

function init(activeLeaf:WorkspaceLeaf, args:any, plugin:CST){
    const [file, state] = args;
    Console.debug("state", state)
    const target = file.path
    const {
        activCursPos,
        activeEl,
        leaves,
        empties,
        isTherePin
    } = getConditions(plugin, activeLeaf)
    const leafExists = leaves.filter(l => { return plugin.getLeafPath(l) === target })[0]
    Console.debug("leaves.length", leaves.length)
    Console.debug("empties.length", empties.length)
    return {
        activCursPos,
        activeEl,
        leaves,
        empties,
        isTherePin,
        leafExists
    }
}

function removeEmpty(plugin: CST, activeEl: HTMLElement, timeout: number): Promise<void> {
    return delayedPromise<void>(timeout, () => {
        const {empties} = plugin.getLeaves(activeEl)
        Console.debug("Detaching leaf");
        empties?.pop()?.detach();
    });
}
function activateLeaf(leaf: WorkspaceLeaf, timeout: number): Promise<void> {
    return delayedPromise<void>(timeout, () => {
        Console.debug("activating leaf")
        app.workspace.setActiveLeaf(leaf, { focus: true })
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

function getConditions(plugin: CST, activeLeaf: WorkspaceLeaf): { activeLeaf: WorkspaceLeaf, activCursPos: any, activeEl: HTMLElement, leaves: WorkspaceLeaf[], empties: WorkspaceLeaf[], isTherePin: boolean } {
    const activCursPos = activeLeaf?.getEphemeralState();
    const { el: activeEl } = plugin.getLeafProperties(activeLeaf);
    const { leaves, empties, isTherePin } = plugin.getLeaves(activeEl);
    return { activeLeaf, activCursPos, activeEl, leaves, empties, isTherePin }
}

