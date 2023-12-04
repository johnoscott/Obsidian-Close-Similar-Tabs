import {
	Notice,
	OpenViewState,
	Plugin,
	TFile,
	Workspace,
	WorkspaceLeaf,
} from "obsidian";
import { around } from "monkey-around";
import { debug } from "./logs";
import { CSTSettingsTab } from "./settings";

declare global {
	interface app {
		workspace: Workspace;
	}
}

interface CSTSettings {
	byWindow: "current" | "all";
	switch: boolean;
}

const DEFAULT_SETTINGS: CSTSettings = {
	byWindow: "current",
	switch: true,
};

export default class CST extends Plugin {
	settings: CSTSettings;
	link: boolean;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new CSTSettingsTab(this.app, this));
		this.link = false; // to prevent from running openFile when openLink already run
		const openLinkPatched = this.openLinkWrapper(this); // I separated this
		const openFilePatched = this.openFileWrapper(this); // if future changes
		this.register(openLinkPatched);
		this.register(openFilePatched);
		this.addCommand({
			id: "quick-switch",
			name: "Switch",
			callback: async () => {
				this.settings.switch = !this.settings.switch;
				const message = this.settings.switch
					? "Close similar tabs ON"
					: "Close similar tabs OFF";
				new Notice(`${message}`);
				await this.saveSettings();
			},
		});
	}

	openLinkWrapper(plugin: CST) {
		const openLinkPatched = around(Workspace.prototype, {
			openLinkText(oldOpenLinkText) {
				return async function (...args) {
					if (!plugin.settings.switch) {
						return oldOpenLinkText.apply(this, args);
					}
					debug("Open Link");
					plugin.link = true;
					setTimeout(async () => {
						plugin.link = false;
					}, 400);
					debug({ args }); //args: 2023-11-05,2023-11-19.md,tab
					let [linktext, sourcePath, newLeaf, OpenViewState] = args;

					// || (ctrl) link into the same page
					const activeLeaf = plugin.getActiveLeaf();
					const isPinned = activeLeaf?.getViewState().pinned
					if (
						linktext?.includes(
							sourcePath.split(".").slice(0, -1).join(".")
						) || isPinned
					) {
						newLeaf = false; // prevent to open new tab even pressing ctrl
						return oldOpenLinkText.apply(this, [
							linktext,
							sourcePath,
							newLeaf,
							OpenViewState,
						]);
					} else {
						// const activeLeaf = plugin.getActiveLeaf();
						const {
							isMainWindow: isMainWindowActive,
							rootSplit: rootSplitActive,
							el: activeEl,
						} = plugin.getLeafProperties(activeLeaf);
						const result = plugin.iterate(
							plugin,
							activeEl,
							linktext,
							newLeaf as boolean
						); // return 1 or undefined

						if (!result) {
							oldOpenLinkText.apply(this, args);
						}
					}
				};
			},
		});
		return openLinkPatched;
	}

	openFileWrapper(plugin: CST) {
		const openFilePatched = around(WorkspaceLeaf.prototype, {
			//@ts-ignore
			openFile(oldOpenFile) {
				return function (...args) {
					if (!plugin.settings.switch) {
						return oldOpenFile.apply(this, args);
					}
					debug("Open File");
					let result: any;
					if (!plugin.link) {
						debug("args:", ...args);
						result = plugin.iterate1(plugin, args);
					}
					// ctrl link to the same page
					if (!result) {
						return oldOpenFile.apply(this, args);
					}
				};
			},
		});
		return openFilePatched;
	}

	delActive() {
		const activeLeaf = this.getActiveLeaf();
		activeLeaf?.detach();
	}

	getActiveLeaf() {
		return app.workspace.getLeaf();
	}

	getLeafProperties(
		leaf: WorkspaceLeaf | null,
		notActive: boolean = false
	): {
		isMainWindow: boolean;
		rootSplit: boolean;
		el: HTMLElement;
		isSameWindow?: boolean;
	} {
		const isMainWindow = leaf!.view.containerEl.win === window;
		const rootSplit = leaf!.getRoot() === this.app.workspace.rootSplit;
		const el = (leaf as any)!.parentSplit.containerEl;
		if (notActive) {
			const isSameWindow = leaf!.view.containerEl.win == activeWindow;
			return { isMainWindow, rootSplit, el, isSameWindow };
		}
		return { isMainWindow, rootSplit, el };
	}

	getLeaves = (activeEl: HTMLElement): WorkspaceLeaf[] => {
		// if all windows set?
		const { workspace } = this.app;
		const leavesList: WorkspaceLeaf[] = [];

		workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
			const {
				isMainWindow: isMainWindowDupli,
				rootSplit: rootSplitDupli,
				el: dupliEl,
				isSameWindow: isSameWindowDupli,
			} = this.getLeafProperties(leaf, true);
			if (
				(isMainWindowDupli && !rootSplitDupli) || //not sidebars
				(isSameWindowDupli && activeEl != dupliEl) || //split window
				(!isSameWindowDupli && this.settings.byWindow === "current") || //not same window
				this.getPinned(leaf)
			) {
				return;
			}
			leavesList.push(leaf);
		});
		return leavesList;
	};

	getPinned(leaf: WorkspaceLeaf) {
		return leaf && leaf.getViewState().pinned;
	}

	iterate1(
		plugin: CST,
		args: [file: TFile, openState?: OpenViewState | undefined],
		newLeaf?: boolean
	) {
		const activeLeaf = plugin.getActiveLeaf();
		const [file, openState] = args;
		debug("openState", { openState }); //openState {active: false}
		// active: true when drag&drop on a tab,
		// active: false when drag/insert a new tab
		// undefined no drag
		const { el: activeEl } = plugin.getLeafProperties(activeLeaf);
		let result;
		const target = file.path;
		const leaves = this.getLeaves(activeEl);
		// console.debug("leaves", leaves.length);
		for (const leaf of leaves) {
			const viewState = leaf.getViewState();
			if (viewState.state?.file === target) {
				if (openState?.active === false) {
					console.debug("openFile: drag/insert");
					const cursPos = leaf.getEphemeralState(); //leaf cursor pos
					// || fix for hover editor
					setTimeout(() => {
						//drag/insert dupli file not on a tab. delete empty tab
						if (
							this.getActiveLeaf().getViewState().type === "empty"
						) {
							this.getActiveLeaf().detach();
							app.workspace.setActiveLeaf(leaf);
							leaf.setEphemeralState(cursPos);
						}
					}, 0); // timeout to detach after opening, if not this is not the tab we want. time = 0 is ok apparently ^^ super fast 🤣
					result = 1; // finished
				} else if (!newLeaf) {
					console.debug("openFile: on existing tab");
					const activePath =
						this.getActiveLeaf().getViewState().state.file;
					if (activePath !== target) {
						plugin.delActive();
						const cursPos = leaf.getEphemeralState();
						app.workspace.setActiveLeaf(leaf);
						leaf.setEphemeralState(cursPos);
						result = 1;
					}
				}
				break;
			}
		}
		return result;
	}

	iterate(
		plugin: CST,
		activeEl: HTMLElement,
		target: string,
		newLeaf?: boolean
	) {
		let result;
		app.workspace.iterateAllLeaves((leaf) => {
			const {
				isMainWindow: isMainWindowDupli,
				rootSplit: rootSplitDupli,
				el: dupliEl,
				isSameWindow: isSameWindowDupli,
			} = this.getLeafProperties(leaf, true);
			if (
				(isMainWindowDupli && !rootSplitDupli) || //not sidebars
				(isSameWindowDupli && activeEl != dupliEl) || //split window
				(!isSameWindowDupli && this.settings.byWindow === "current") //not same window
			) {
				return;
			}
			const viewState = leaf.getViewState();
			if (viewState.state?.file?.includes(target)) {
				if (!newLeaf) plugin.delActive();
				const cursPos = leaf.getEphemeralState(); //existing leaf cursor pos
				app.workspace.setActiveLeaf(leaf);
				leaf.setEphemeralState(cursPos);
				result = 1;
			}
		});
		return result;
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
