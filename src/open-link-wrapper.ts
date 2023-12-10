import { around } from "monkey-around";
import CST from "./main";
import { Workspace, WorkspaceLeaf } from "obsidian";

export function openLinkWrapper(plugin: CST) {
    const openLinkPatched = around(Workspace.prototype, {
        openLinkText(old) {
            return async function (...args) {
                if (!plugin.settings.switch) {
                    return old.apply(this, args);
                }
                console.debug("Open Link");
                plugin.link = true;
                setTimeout(async () => {
                    plugin.link = false;
                }, 400);
                console.debug(args); //args: 2023-11-05,2023-11-19.md,tab
                let [linktext, sourcePath, newLeaf, OpenViewState] = args;
                console.debug("newLeaf", newLeaf)
                console.debug("OpenViewState", OpenViewState)
                const getLeaf = plugin.getLeaf()
                console.debug("getLeaf", getLeaf.getDisplayText())
                const activeLeaf0 = plugin.getActiveLeaf()
                console.debug("activeLeaf.getDisplayText() ", activeLeaf0.getDisplayText())
                const activeLeaf = plugin.getVisibleLeaf()
                console.debug("getVisibleLeaf", activeLeaf?.getDisplayText())
                if (
                    linktext?.includes(
                        sourcePath.split(".").slice(0, -1).join(".")
                    )
                ) {
                    // link to same page
                    console.debug("link to same page")
                    return old.apply(this, [
                        linktext,
                        sourcePath,
                        newLeaf = false,// don't open new tab if ctrl
                        OpenViewState,
                    ]);
                } else {
                    console.debug("to other page")
                    const activeEl = (activeLeaf as any).parentSplit.containerEl
                    let result;
                    if (activeLeaf && plugin.getPinned(activeLeaf)) {
                        console.debug("getPinned")
                        const { result, empties, leaves } = iterate(
                            plugin,
                            activeEl,
                            linktext,
                            false, //newLeaf
                        ); // return 1 or undefined		
                        // delete empty
                        empties?.pop()?.detach()

                    } else {
                        console.log("no newLeaf")
                        const { leaves, empties } = plugin.getLeaves(activeEl)
                        const linkPart = getFirstPartOfWikiLink(linktext)
                        const targetFile = app.metadataCache.getFirstLinkpathDest(
                            linkPart,//→ page.md
                            sourcePath,
                        );
                        const leafExists = leaves.filter(l => { return plugin.getLeafPath(l) === targetFile?.path })[0]
                        if (leafExists) { // dupli
                            console.log("leafExists")
                            if (newLeaf === false) { //without ctrl
                                console.log("without ctrl")
                                if (linkPart === linktext) { // ok link without attr 
                                    console.log("no attr")
                                    activeLeaf?.detach()
                                    setTimeout(() => {
                                        app.workspace.setActiveLeaf(leafExists, { focus: true })
                                    }, 0)
                                    return
                                } else { // ok link with attr 
                                    console.log("attr")
                                    leafExists.detach()
                                    return old.apply(this, args)
                                }
                            } else {
                                console.log("with ctrl")
                                if (linkPart === linktext) { // ok link without attr 
                                    console.log("no attr")
                                    setTimeout(() => {
                                        app.workspace.setActiveLeaf(leafExists, { focus: true })
                                    }, 0)
                                    return
                                } else { // ok link with attr 
                                    console.log("attr")
                                    leafExists.detach()
                                    return old.apply(this, args)
                                }
                            }
                        } else { // normal
                            console.log("link chg actual page")
                            return old.apply(this, args);
                        }
                    }
                }
            };
        },
    });
    return openLinkPatched;
}

function hasLinkAttr(linkText: string) {
    const separators = "#^|";
    for (let i = 0; i < separators.length - 1; i++) {
        const index = linkText.indexOf(separators[i]);
        if (index !== -1) {
            return true
        }
    }
    return
}

function getFirstPartOfWikiLink(linkText: string) {
    const separators = "#^|";
    let separatorIndex = linkText.length;

    for (let i = 0; i < separators.length - 1; i++) {
        const index = linkText.indexOf(separators[i]);
        if (index !== -1) {
            separatorIndex = index;
            break
        }
    }

    const firstPart = linkText.substring(0, separatorIndex);
    return firstPart;
}


function iterate(
    plugin: CST,
    activeEl: HTMLElement,
    target: string,
    newLeaf = false,
) {
    let result;
    let leaves: WorkspaceLeaf[] = []
    let empties: WorkspaceLeaf[] = []

    app.workspace.iterateAllLeaves((leaf) => {
        const {
            isMainWindow: isMainWindowDupli,
            rootSplit: rootSplitDupli,
            el: dupliEl,
            isSameWindow: isSameWindowDupli,
        } = plugin.getLeafProperties(leaf, true);
        if (
            (isMainWindowDupli && !rootSplitDupli) || //not sidebars
            (isSameWindowDupli && activeEl != dupliEl) || //split window
            (!isSameWindowDupli && plugin.settings.byWindow === "current") //not same window
        ) {
            return;
        }
        if (plugin.isEmpty(leaf)) {
            empties.push(leaf)
            return
        }
        leaves.push(leaf)
        const viewState = leaf.getViewState();
        if (viewState.state?.file?.includes(target)) {
            if (!newLeaf) plugin.delActive();
            const cursPos = leaf?.getEphemeralState(); //existing leaf cursor pos
            app.workspace.setActiveLeaf(leaf);
            leaf.setEphemeralState(cursPos);
            result = 1;
        }
    });
    return { result, empties, leaves };
}