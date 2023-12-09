// https://github.com/aidan-gibson/obsidian-opener/blob/b80b0ea088c3ab94c571d5a1fdd0244a9adadce4/main.ts#L198
import { around } from "monkey-around";
import type CST from "./main";
import { WorkspaceLeaf } from "obsidian";


// todo: to pinned tab / links more tests

export function openFileWrapper(plugin: CST) {
    const openFilePatched = around(WorkspaceLeaf.prototype, {
        //@ts-ignore
        openFile(old) {
            return function (...args) {
                // console.debug("first args:", ...args);// file + object: active, state { mode: 'source', file: '2023-12-06.md' }
                /* state → {active: false}
                active: true when drag&drop on a tab,
                active: false when drag/insert a new tab
                undefined no drag */
                let result: any;
                if (!plugin.settings.switch || plugin.link) {
                    return old.apply(this, args);
                }

                console.debug("Open File");
                const [file, state] = args;
                console.debug("args", args)
                console.debug("state", state)
                const activeLeaf = plugin.getActiveLeaf()
                console.debug("activeLeaf.getDisplayText() ", activeLeaf.getDisplayText())
                const target = file.path

                if (activeLeaf.getDisplayText() === "Files") {
                    console.debug("EXPLORER")
                    console.debug("app.workspace.getLeaf()", app.workspace.getLeaf().getDisplayText())
                    const activeLeaf = app.workspace.getLeaf()// still check what active leaf works
                    const {
                        activCursPos,
                        activeEl,
                        leaves,
                        empties,
                        isTherePin
                    } = getConditions(plugin, activeLeaf)
                    const leafExists = leaves.filter(l => { return plugin.getLeafPath(l) === target })[0]
                    leaves.forEach((l) => console.debug("l before", l.getDisplayText()))
                    empties.forEach((l) => console.debug("e before", l.getDisplayText()))
                    if (leafExists) {
                        setTimeout(() => {
                            app.workspace.setActiveLeaf(leafExists, { focus: true })
                        }, 0);
                        if (plugin.ctrl) {//on existing tab+ ctrl
                            console.debug("empties.length", empties.length)
                            empties.pop()?.detach()
                        } else {
                            if (state?.active === false) {
                                console.debug("drag/insert")
                                empties.pop()?.detach()
                                // if activeLeaf pinned and drag/insert after this tab. 2 empties are added. extremely rare situation that is impossible to fix event using monly after. I can add a settings to have always 1 empty tab per active container. it will add only 1 empty max. 
                            } else {//on existing tab
                                if (plugin.getLeafPath(activeLeaf) !== target)//don't close actual leaf as dupli
                                    activeLeaf.detach()
                            }
                        }
                    } else {
                        console.debug("return old")
                        return old.apply(this, args)
                    }

                } if (state?.active === true) {
                    const activeLeaf = app.workspace.getLeaf()
                    console.debug("quickswith or drag on tab header")
                    const {
                        activCursPos,
                        activeEl,
                        leaves,
                        empties,
                        isTherePin
                    } = getConditions(plugin, activeLeaf)
                    const leafExists = leaves.filter(l => { return plugin.getLeafPath(l) === target })[0]
                    if (leafExists) {
                        console.debug("leafExists")
                        setTimeout(() => {
                            app.workspace.setActiveLeaf(leafExists, { focus: true })
                        }, 0);
                        if (plugin.ctrl) {// quick switch ctrl
                            console.debug("quick switch ctrl")
                            empties.pop()?.detach()
                        }
                        else {// quick switch
                            console.debug("quick switch or drag header or today note")
                            if (plugin.getLeafPath(activeLeaf) !== target) activeLeaf.detach()
                        }
                    } else { // today note no existing tab
                        console.debug("// today note no existing tab")
                        return old.apply(this, args)
                    }
                }
            };
        },
    });
    return openFilePatched;
}

function getPinned(leaf: WorkspaceLeaf) {
    return leaf?.getViewState().pinned;
}

// todo test bugs/ test cursor position/ctrl link to the same page/problem of history
function monkeyAfter(activeEl: HTMLElement, plugin: CST, leaves: WorkspaceLeaf[], empties: WorkspaceLeaf[], activeLeaf: WorkspaceLeaf, activCursPos: any) {
    const { leaves: leavesAfter, empties: emptiesAfter } = plugin.getLeaves(activeEl)
    leavesAfter.forEach(l => console.debug("l after", l.getDisplayText()))
    emptiesAfter.forEach(l => console.debug("e after", l.getDisplayText()))
    const isEmptiesAdded = emptiesAfter.length && emptiesAfter.length < empties.length//strange but that's the way
    console.debug("empties.length", empties.length)
    console.debug("emptiesAfter.length", emptiesAfter.length)

    // const newLeaf = leavesAfter.filter(l => !leaves.includes(l))[0]
    // const dupli = leaves.filter(l => { return plugin.getLeafPath(newLeaf) === plugin.getLeafPath(l) })[0]
    // const original = leaves.filter(l => { return l !== dupli && plugin.getLeafPath(dupli) })[0]
    // console.debug("dupli !== original", dupli !== original)
    // console.log("dupli", plugin.getLeafPath(dupli))
    if (isEmptiesAdded) { // delete empty added when not detaching active leaf
        console.log("ici")
        emptiesAfter.length
        empties.pop()?.detach()
        // emptiesAfter.forEach(empty => {
        //     empty.detach()
        // });
    }
    // const isPinnedActive = activeLeaf.getViewState().type === "empty"
    // console.log("plugin.getLeafPath(newLeaf)", plugin.getLeafPath(newLeaf))
    // console.log("(plugin.getLeafPath(activeLeaf))", (plugin.getLeafPath(activeLeaf)))
    // console.log("(plugin.getLeafPath(original))", (plugin.getLeafPath(original)))
    // if (dupli && dupli !== activeLeaf && isPinnedActive) {
    //     console.log("is NOT activeLeaf")
    //     if (plugin.getLeafPath(newLeaf) === plugin.getLeafPath(dupli))
    //         newLeaf?.detach()
    //     if (plugin.getLeafPath(newLeaf) !== (plugin.getLeafPath(activeLeaf))) {
    //         console.log("reveal dupli")
    //         app.workspace.revealLeaf(dupli)
    //     } else if ((plugin.getLeafPath(activeLeaf)) === undefined) {//empty && pinned
    //         console.log("undefined")
    //         setTimeout(() => {
    //             app.workspace.revealLeaf(dupli)
    //         }, 80);
    //     }
    //     // app.workspace.setActiveLeaf(leaf);
    //     // leaf.setEphemeralState(cursPos);
    // } else if (dupli) { // ok
    //     console.log("is activeLeaf")
    //     const activCursPos = newLeaf?.getEphemeralState();
    //     newLeaf?.detach()
    //     app.workspace.revealLeaf(dupli)
    //     // app.workspace.setActiveLeaf(dupli);
    //     // dupli.setEphemeralState(activCursPos);
    // } else {
    //     console.log("autre")
    // }
}

function getConditions(plugin: CST, activeLeaf: WorkspaceLeaf): { activeLeaf: WorkspaceLeaf, activCursPos: any, activeEl: HTMLElement, leaves: WorkspaceLeaf[], empties: WorkspaceLeaf[], isTherePin: boolean } {
    console.log("activeLeaf", activeLeaf?.getDisplayText())
    const activCursPos = activeLeaf?.getEphemeralState();
    const { el: activeEl } = plugin.getLeafProperties(activeLeaf);
    const { leaves, empties, isTherePin } = plugin.getLeaves(activeEl);
    return { activeLeaf, activCursPos, activeEl, leaves, empties, isTherePin }
}

