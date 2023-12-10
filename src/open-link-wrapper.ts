import { around } from "monkey-around";
import CST from "./main";
import { Workspace } from "obsidian";

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

                console.debug("args: ", args); //e.g: 2023-11-05,2023-11-19.md,tab
                let [linktext, sourcePath, newLeaf, OpenViewState] = args;
                console.debug("newLeaf", newLeaf)
                const activeLeaf = plugin.getVisibleLeaf()
                console.debug("getVisibleLeaf", activeLeaf?.getDisplayText())

                if ( // ok // to same page
                    linktext?.includes(
                        sourcePath.split(".").slice(0, -1).join(".")
                    )
                ) {
                    console.debug("to same page") // ctrl or not
                    return old.apply(this, [
                        linktext,
                        sourcePath,
                        newLeaf = false,// don't open new tab
                        OpenViewState,
                    ]);

                } else { // to other page
                    console.debug("to other page")
                    const activeEl = (activeLeaf as any).parentSplit.containerEl
                    const { leaves, empties } = plugin.getLeaves(activeEl)
                    const linkPart = getFirstPartOfWikiLink(linktext)
                    const targetFile = app.metadataCache.getFirstLinkpathDest(
                        linkPart,//→ page.md
                        sourcePath,
                    );
                    const leafExists = leaves.filter(l => { return plugin.getLeafPath(l) === targetFile?.path })[0]

                    if (activeLeaf && plugin.getPinned(activeLeaf)) { // active Leaf Pinned
                        console.debug("getPinned")
                        if (leafExists) {
                            console.debug("leafExists")
                            if (linkPart === linktext) { // ok //link without attr 
                                console.debug("no attr")
                                setTimeout(() => {
                                    app.workspace.setActiveLeaf(leafExists, { focus: true })
                                }, 0)
                            } else { // ok //link with attr
                                console.debug("attr")
                                leafExists.detach()
                                return old.apply(this, args)
                            }
                        } else { // no dupli
                            return old.apply(this, args);
                        }

                    } else {
                        console.debug("no newLeaf")
                        if (leafExists) { // dupli
                            console.debug("leafExists")
                            if (newLeaf === false) { //without ctrl
                                console.debug("without ctrl")
                                if (linkPart === linktext) { // ok link without attr 
                                    console.debug("no attr")
                                    activeLeaf?.detach()
                                    setTimeout(() => {
                                        app.workspace.setActiveLeaf(leafExists, { focus: true })
                                    }, 0)
                                    return
                                } else { // link with attr // ok?
                                    console.debug("attr")
                                    leafExists.detach()
                                    return old.apply(this, args)
                                }
                            } else { // ok // with ctrl 
                                console.debug("with ctrl")
                                if (linkPart === linktext) { // ok link without attr 
                                    console.debug("no attr")
                                    setTimeout(() => {
                                        app.workspace.setActiveLeaf(leafExists, { focus: true })
                                    }, 0)
                                    return
                                } else { // ok // link with attr 
                                    console.debug("attr")
                                    leafExists.detach()
                                    return old.apply(this, args)
                                }
                            }
                        } else { // normal
                            console.debug("link chg actual page")
                            return old.apply(this, args);
                        }
                    }
                }
            };
        },
    });
    return openLinkPatched;
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