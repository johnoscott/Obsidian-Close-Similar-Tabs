import { around } from "monkey-around";
import CST from "./main";
import { Workspace, WorkspaceLeaf } from "obsidian";
import { Console } from "./Console";
import * as path from "path";

export function openLinkWrapper(plugin: CST) {
    const openLinkPatched = around(Workspace.prototype, {
        openLinkText(old) {
            return async function (...args) {
                // CST disabled
                if (!plugin.settings.switch) {
                    return old.apply(this, args);
                }
                // to not trigger openFile
                Console.debug("Open Link");
                plugin.link = true;
                setTimeout(async () => {
                    plugin.link = false;
                }, 400);

                Console.debug("args: ", args); //e.g: 2023-11-05,2023-11-19.md,tab
                let [linktext, sourcePath, newLeaf, OpenViewState] = args;
                Console.debug("newLeaf", newLeaf)
                Console.debug("OpenViewState", OpenViewState)
                let activeLeaf = plugin.getVisibleLeaf()
                Console.debug("getVisibleLeaf", activeLeaf?.getDisplayText())

                if ( // ok // to same page
                    ((path.basename(sourcePath, path.extname(sourcePath))===(getFirstPartOfWikiLink(linktext)) || linktext.trim().startsWith("#"))) && newLeaf !== "tab" && !plugin.ctrl && OpenViewState === undefined) {
                    const text = !!newLeaf ? "newleaf true, not 'tab'" : "to same page newleaf false"
                    Console.debug("text", text)
                    return old.apply(this, [
                        linktext,
                        sourcePath,
                        newLeaf = !!newLeaf,// changed for URI 
                        OpenViewState,
                    ]);
                } else { // to other page
                    Console.debug("to other page")
                    if (activeLeaf?.getDisplayText() === "Files") {
                        activeLeaf = plugin.app.workspace.getMostRecentLeaf()
                        Console.log("activeLeaf", activeLeaf?.getDisplayText())
                    }
                    const { dupli, linkPart } = getDupli(plugin, linktext, sourcePath, activeLeaf)
                    if (activeLeaf && plugin.getPinned(activeLeaf)) { // active Leaf Pinned
                        Console.debug("getPinned")
                        if (dupli) {
                            Console.debug("dupli")
                            if (linkPart === linktext) { // ok //link without attr 
                                Console.debug("no attr")
                                setTimeout(() => {
                                    app.workspace.setActiveLeaf(dupli, { focus: true })
                                }, 0)
                            } else { // ok //link with attr
                                Console.debug("attr")
                                dupli.detach()
                                return old.apply(this, args)
                            }
                        } else { // no dupli
                            return old.apply(this, args);
                        }

                    } else {
                        Console.debug("no newLeaf")
                        if (dupli) { // dupli
                            Console.debug("dupli")
                            if (newLeaf === false) { //without ctrl
                                Console.debug("without ctrl")
                                if (linkPart === linktext) { // ok link without attr 
                                    Console.debug("no attr")
                                    activeLeaf?.detach()
                                    setTimeout(() => {
                                        app.workspace.setActiveLeaf(dupli, { focus: true })
                                    }, 0)
                                    return
                                } else { // link with attr // ok?
                                    Console.debug("attr")
                                    dupli.detach()
                                    return old.apply(this, args)
                                }
                            } else { // ok // with ctrl 
                                Console.debug("with ctrl")
                                if (linkPart === linktext) { // ok link without attr
                                    if (newLeaf === "tab") {
                                        Console.debug("newtab")
                                        if (dupli) {
                                            Console.debug("dupli", dupli)
                                            setTimeout(() => {
                                                app.workspace.setActiveLeaf(dupli, { focus: true })
                                            }, 0)
                                            return
                                        } else {
                                            Console.debug("not dupli", dupli)
                                            return old.apply(this, args);
                                        }
                                    } else {
                                        Console.debug("no attr")
                                        setTimeout(() => {
                                            app.workspace.setActiveLeaf(dupli, { focus: true })
                                        }, 0)
                                        return
                                    }
                                } else { // ok // link with attr 
                                    Console.debug("attr")
                                    dupli.detach()
                                    return old.apply(this, args)
                                }
                            }
                        } else { // normal
                            Console.debug("link chg actual page")
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

function getDupli(plugin: CST, linktext: string, sourcePath: string, activeLeaf: WorkspaceLeaf | null) {
    const activeEl = (activeLeaf as any).parentSplit.containerEl
    Console.debug("activeEl", activeEl)
    const { leaves } = plugin.getLeaves(activeEl)
    Console.debug("leaves", leaves)
    const linkPart = getFirstPartOfWikiLink(linktext)
    const targetFile = app.metadataCache.getFirstLinkpathDest(
        linkPart,//→ page.md
        sourcePath,
    );
    Console.debug("targetFile", targetFile)
    const dupli = leaves.filter(l => { return plugin.getLeafPath(l) === targetFile?.path })[0]
    return { dupli, linkPart }
}

// I used path
// function extractFileName(filePath: string): string {
//     const fileNameWithExtension = filePath.split('/').pop();
//     if (fileNameWithExtension) {
//         const fileName = fileNameWithExtension.split('.')[0];
//         return fileName;
//     } else {
//         return '';
//     }
// }