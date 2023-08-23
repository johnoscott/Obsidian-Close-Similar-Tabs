import { Notice, Plugin, View, WorkspaceLeaf, debounce } from "obsidian";
import { getPath } from "./utils"
import { DuplicateTabsModal } from "./modal";
import { DuplicateTabsSettingsTab } from "./settings";

interface CSTSettings {
	byWindow: "current" | "all";
	noEmptyTabs: boolean;
	enableCST: boolean;
	beNotified: boolean;
}

const DEFAULT_SETTINGS: CSTSettings = {
	byWindow: "current",
	noEmptyTabs: true,
	enableCST: true,
	beNotified: true,
};

export default class CST extends Plugin {
	settings: CSTSettings;
	leavesAtStart: WorkspaceLeaf[] = [];
	leaves: WorkspaceLeaf[] = [];
	activeLeaf: WorkspaceLeaf | null;
	once = false

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new DuplicateTabsSettingsTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {

			// tab opened with click + ctrl
			// this.registerEvent(
			// 	this.app.workspace.on(
			// 		"layout-change",
			// 		() => {
			// 			if (!this.settings.enableCST) return
			// 			console.debug("////////// layout-change")
			// 			const modif = this.addedTab()
			// 			if (modif === 0) {
			// 				// be aware clicking the explorer, activeLeaf is the explorer. why we need visible
			// 				const visibleLeaf = this.getVisibleLeaf()
			// 				const visibleLeafEl = (visibleLeaf as any).parent.containerEl
			// 				const sameEl: WorkspaceLeaf[] = []

			// 				for (const leaf of this.leaves) {
			// 					const isSameWindow = leaf!.view.containerEl.win == activeWindow
			// 					if (
			// 						isSameWindow
			// 						&& (leaf as any)!.parent.containerEl == visibleLeafEl
			// 						&& getPath(leaf)
			// 					) {
			// 						sameEl.push(leaf)
			// 					}
			// 				}

			// 				const listedPath: string[] = []
			// 				for (const leaf of sameEl) {
			// 					if (this.getPinned(leaf)) continue
			// 					if (
			// 						!listedPath.includes(getPath(leaf))
			// 					) listedPath.push(getPath(leaf))
			// 					else {
			// 						leaf.detach()
			// 						if (this.settings.beNotified) new Notice("already opened.")
			// 						break
			// 					}
			// 				}
			// 			}
			// 		}))


			this.registerEvent(this.app.workspace.on(
				// @ts-ignore
				"active-leaf-change",
				async (leaf: WorkspaceLeaf) => {
					if (!this.settings.enableCST) return
					console.debug("////////// active-leaf-change")
					// this.allActivePath(leaf, true) 
					const modif = this.addedTab()
					if (modif === -1
						|| leaf.getViewState().type === "swar8080/AVAILABLE_PLUGIN_UPDATES"
						) {
						return
					}
					else { // === 0 || 1
						this.activeLeaf = leaf
						if (this.getPinned(leaf)) return
						const duplicate = this.getDupliActive();
						const notEmpty = await this.detachLeaf(duplicate)
						if (this.settings.beNotified && notEmpty) {
							new Notice("already opened");
						}
					}
				})
			);
		})

		this.addCommand({
			id: "parameters",
			name: "CST parameters",
			callback: () => {
				new DuplicateTabsModal(this.app, this).open();
			},
		});
		this.addCommand({
			id: "quick-switch",
			name: "CST quick switch",
			callback: async () => {
				this.settings.enableCST =
					!this.settings.enableCST;
				const message = this.settings.enableCST
					? "Close similar tabs ON"
					: "Close similar tabs OFF";
				new Notice(`${message}`);
				await this.saveSettings();
			},
		});
	}

	getDupliActive = () => {
		const leaves = this.getLeaves()
		// pathInfos(leaves)
		const activeLeaf = this.activeLeaf
		const { isMainWindow: isMainWindowActive, rootSplit: rootSplitActive, el: activeEl } =
			this.getLeafProperties(activeLeaf)

		if (!rootSplitActive && isMainWindowActive) return

		for (const leaf of leaves) {
			const {
				isMainWindow: isMainWindowDupli,
				rootSplit: rootSplitDupli,
				el: dupliEl,
				isSameWindow: isSameWindowDupli
			} = this.getLeafProperties(leaf, true)

			if (
				leaf === activeLeaf //pass activeleaf
				|| isMainWindowDupli && !rootSplitDupli //protect sidebars
				|| isSameWindowDupli && activeEl !== dupliEl// allow spliting
				|| getPath(leaf) !== (getPath(activeLeaf))
				// other windows
				|| !isSameWindowDupli && this.settings.byWindow === "current" //&& byWindow
			) {
				// if clicking a link this operator is run twice. or when pressing ctrl
				this.once = true
				setTimeout(() => {
					this.once = false
				}, 200)
				continue
			}
			return leaf
		}
	}

	getLeafProperties(leaf: WorkspaceLeaf | null, notActive: boolean = false)
		: { isMainWindow: boolean, rootSplit: boolean, el: HTMLElement, isSameWindow?: boolean } {
		const isMainWindow = leaf!.view.containerEl.win === window;
		const rootSplit = leaf!.getRoot() === this.app.workspace.rootSplit;
		const el = (leaf as any)!.parentSplit.containerEl;
		if (notActive) {
			const isSameWindow = leaf!.view.containerEl.win == activeWindow;
			return { isMainWindow, rootSplit, el, isSameWindow };
		}
		return { isMainWindow, rootSplit, el };
	}

	detachLeaf = async (duplicate: WorkspaceLeaf | undefined) => {
		let notEmpty = false
		if (!duplicate) return
		//allow undo close tab
		if (this.once) {
			if ((this.activeLeaf as any).history.backHistory.length) {
				await (this.activeLeaf as any).history.back();
			}
		}

		if (
			getPath(duplicate) //&& getPath(duplicate) === getPath(this.activeLeaf)
		) {
			this.activeLeaf?.detach()
			notEmpty = true
			this.once = false
		} else {
			// if (this.settings.noEmptyTabs && duplicate.view.getDisplayText()==="New tab") {
			if (this.settings.noEmptyTabs && duplicate.getViewState().type === "empty") {
				this.activeLeaf?.detach()
			}
		}

		this.app.workspace.revealLeaf(duplicate)
		return notEmpty
	}

	getLeaves = (): WorkspaceLeaf[] => {// if all windows set?
		const { workspace } = this.app
		const leavesList: WorkspaceLeaf[] = [];

		workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			if (leaf!.getRoot() === workspace.rootSplit && !this.getPinned(leaf)) {
				leavesList.push(leaf);
			}
		});
		return leavesList;
	}

	// was damn useful to debug. activeLeaf this is not so simple...
	allActivePath = (leaf: WorkspaceLeaf, active_leaf_change = false) => {
		if (active_leaf_change) {
			console.log("[ active-leaf-change ]")
			console.log("ALC leaf", getPath(leaf))
		}
		const getActiveFilePath = this.app.workspace.getActiveFile()?.path //or name
		console.log("ActiveFile", getActiveFilePath)
		// console.log("active'View' path", this.app.workspace.getActiveViewOfType(View)?.leaf?.getViewState().state.file)
		// console.log("VisibleLeaf path", getPath(this.getVisibleLeaf()))
		// console.log("app.workspace.activeLeaf path", getPath((this.app as any).workspace.activeLeaf))
	}

	addedTab = () => {
		this.leaves = this.getLeaves()
		let value = NaN
		if (this.leavesAtStart.length > this.leaves.length) value = -1
		else if (this.leavesAtStart.length < this.leaves.length) {
			value = 1
		}
		else value = 0
		this.leavesAtStart = this.leaves
		return value
	}

	getVisibleLeaf() {
		const { workspace } = this.app
		return workspace.getLeaf(false)
	}

	getPinned(leaf: WorkspaceLeaf) {
		return leaf && leaf.getViewState().pinned
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// I didn't need undoHistory status finally

// // search github: obsidian @codemirror/history
// let hadUndoHistory = false
// try {
// 	(this.app as any).workspace.activeLeaf.view.editor.undo()
// 	hadUndoHistory = true
// 	console.debug("history")
// } catch {
// 	console.debug("no history")
// }
