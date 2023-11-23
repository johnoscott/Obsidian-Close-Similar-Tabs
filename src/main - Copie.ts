import { Notice, Plugin, Workspace, WorkspaceLeaf } from "obsidian";
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
		this.link = false;
		const { openLinkPatched, openFilePatched } = this.openLinkWrapper(this);
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
					let result;
					let [linktext, sourcePath, newLeaf, OpenViewState] = args;

					// || ctrl link to the same page
					if (
						linktext?.includes(
							sourcePath.split(".").slice(0, -1).join(".")
						)
					) {
						newLeaf = false;
						return oldOpenLinkText.apply(this, [
							linktext,
							sourcePath,
							newLeaf,
							OpenViewState,
						]);
					}

					const activeLeaf = plugin.getActiveLeaf();
					const {
						isMainWindow: isMainWindowActive,
						rootSplit: rootSplitActive,
						el: activeEl,
					} = plugin.getLeafProperties(activeLeaf);

					// avoid left right splits
					if (!rootSplitActive && isMainWindowActive)
						return oldOpenLinkText.apply(this, args);

					result = plugin.iterate(
						plugin,
						activeEl,
						linktext,
						newLeaf as boolean
					);

					if (!result) {
						return oldOpenLinkText.apply(this, args);
					}
				};
			},
		});

		const openFilePatched = around(WorkspaceLeaf.prototype, {
			//@ts-ignore
			openFile(oldOpenFile) {
				return function (...args) {
					if (!plugin.settings.switch) {
						return oldOpenFile.apply(this, args);
					}
					debug("Open File");
					console.debug(...args);
					const [file, openState] = args;
					let result;
					if (!plugin.link) {
						const activeLeaf = plugin.getActiveLeaf();
						const {
							isMainWindow: isMainWindowActive,
							rootSplit: rootSplitActive,
							el: activeEl,
						} = plugin.getLeafProperties(activeLeaf);

						if (!rootSplitActive && isMainWindowActive)
							return oldOpenFile.apply(this, args);
						result = plugin.iterate(plugin, activeEl, file.path);
						// ctrl link to the same page
						if (!result) {
							return oldOpenFile.apply(this, args);
						}
					}
				};
			},
		});
		return {
			openLinkPatched,
			openFilePatched,
		};
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
				leaf === this.getActiveLeaf() ||
				(isMainWindowDupli && !rootSplitDupli) || //not sidebars
				(isSameWindowDupli && activeEl != dupliEl) || //split window
				// this.getPath(leaf) === this.getPath(this.getActiveLeaf()) ||
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

	getPath(leaf: WorkspaceLeaf | null): string {
		return (leaf?.view as any).file?.path || "";
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
