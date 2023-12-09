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
                        console.debug("else")
                        const { result, empties, leaves } = iterate(
                            plugin,
                            activeEl,
                            linktext,
                            !!newLeaf
                        ); // return 1 or undefined
                        const separator = linktext.includes("#") ? "#" : "^";
                        const linkParts = linktext.split(separator);
                        const targetFile = app.metadataCache.getFirstLinkpathDest(
                            linkParts[0],//→ page.md
                            sourcePath,
                        );
                        console.debug("targetFile", targetFile?.path)
                        const leafExists = leaves.filter((l) => {
                            // console.debug("plugin.getLeafPath(l)", plugin.getLeafPath(l))
                            return plugin.getLeafPath(l) === targetFile?.path
                        })[0]
                        console.debug("leafExists", leafExists?.getDisplayText())
                        if (leafExists)
                            if (plugin.ctrl) {
                                setTimeout(() => {
                                    leafExists.detach()
                                }, 80);
                            }
                    }
                    if (!result) {
                        old.apply(this, args);
                    }
                }
            };
        },
    });
    return openLinkPatched;
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