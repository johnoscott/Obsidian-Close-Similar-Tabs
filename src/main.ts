import { Plugin, View } from "obsidian";
import { DuplicateTabsSettingsTab } from "src/settings";

interface TabCessionsSettings {
	byWindow: "current" | "all",
}

const DEFAULT_SETTINGS: TabCessionsSettings = {
	byWindow: "current",
};

export default class DuplicateTabs extends Plugin {
	settings: TabCessionsSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new DuplicateTabsSettingsTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", () => {
					this.findDuplicates();
				})
			);
		});
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

	// activeLeaf is the last leaf created 
	// and then removed when a duplicate is found 
	findDuplicates() {
		const byWindow = this.settings.byWindow;
		// on what window active is
		const activeView = this.app.workspace.getActiveViewOfType(View);
		const isMainWindowActive = activeView?.containerEl.win == window;

		// get active relative path (folder?/name)
		const activeLeaf = this.app.workspace.activeLeaf;
		const activeLeafPath = activeLeaf?.getViewState().state.file;

		this.app.workspace.iterateAllLeaves((leaf) => {
			const leafState = leaf.getViewState();
			const leafPath = leafState.state.file;
			const isMainWindowDupli = leaf.view.containerEl.win == window;
			const isSameWindowDupli = leaf.view.containerEl.win == activeWindow;
			const rootSplitDupli =
				leaf.getRoot() == this.app.workspace.rootSplit;
			const correctPane =
				(isMainWindowDupli && rootSplitDupli) || !isMainWindowDupli;

			if (leafPath && correctPane) {
				if (byWindow=== 'all') {
					if (
						leaf !== activeLeaf &&
						leafPath === activeLeafPath
					) {
						activeLeaf?.detach();
						this.app.workspace.revealLeaf(leaf);
					}
				} else {
					const correctPane1 =
						(isMainWindowDupli && isMainWindowActive) ||
						(!isMainWindowActive &&
							!isMainWindowDupli &&
							isSameWindowDupli);
					if (
						correctPane1 &&
						leaf !== activeLeaf &&
						leaf.getViewState().state.file === activeLeafPath
					) {
						activeLeaf?.detach();
						this.app.workspace.revealLeaf(leaf);
					}
				}
			}
		});
	}
}

