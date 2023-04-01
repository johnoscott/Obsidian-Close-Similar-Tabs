import { Plugin, View } from "obsidian";
import { DuplicateTabsSettingsTab } from "src/settings";
import { DuplicateTabsModal } from "./modal";

interface TabCessionsSettings {
	byWindow: "current" | "all";
	noEmptyTabs: boolean;
	toggleCloseSimilarTabs: boolean;
}

const DEFAULT_SETTINGS: TabCessionsSettings = {
	byWindow: "current",
	noEmptyTabs: true,
	toggleCloseSimilarTabs: true,
};

export default class DuplicateTabs extends Plugin {
	settings: TabCessionsSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new DuplicateTabsSettingsTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.workspace.on("active-leaf-change", () => {
					if (this.settings.toggleCloseSimilarTabs)
						this.findDuplicates();
				})
			);
		});

		this.addCommand({
			id: "close-similar-tabs-params",
			name: "Close similar tabs parameters",
			callback: () => {
				new DuplicateTabsModal(this.app, this).open();
			},
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
		const noEmptyTabs = this.settings.noEmptyTabs;
		// on what window active is
		const{workspace}= this.app;
		const activeView = workspace.getActiveViewOfType(View);
		const isMainWindowActive = activeView?.containerEl.win == window;
		const rootSplitActive =
			activeView?.leaf.getRoot() == workspace.rootSplit;

		// get active relative path (folder?/name)
		const activeLeaf = workspace.activeLeaf;
		const activeLeafPath = activeLeaf?.getViewState().state.file;
		const activeTitlePart = activeLeafPath?.split('/').pop().split('.')[0];
		const activetitle = activeView?.getDisplayText()

		workspace.iterateAllLeaves((leaf) => {
			if (!activeLeafPath || activeTitlePart !== activetitle) return // to allowed open linked view
			const leafState = leaf.getViewState();
			const leafPath = leafState.state.file;
			const leafTitle = leaf.getDisplayText()
			const leafTitlePart = leafPath?.split('/').pop().split('.')[0];
			if (!leafPath || leafTitlePart !== leafTitle) return // to allowed open linked view

			const isMainWindowDupli = leaf.view.containerEl.win == window;
			const isSameWindowDupli = leaf.view.containerEl.win == activeWindow;
			const rootSplitDupli =
				leaf.getRoot() == workspace.rootSplit;
			const correctPane =
				(isMainWindowDupli && rootSplitDupli) || !isMainWindowDupli;

			if (
				leaf !== activeLeaf &&
				leafPath &&
				leafPath === activeLeafPath &&
				(!isMainWindowActive || rootSplitActive) &&
				correctPane
			) {
				if (byWindow === "all") {
					activeLeaf?.detach();
					workspace.revealLeaf(leaf);
				} else {
					const correctPane1 =
						(isMainWindowDupli && isMainWindowActive) ||
						(!isMainWindowActive &&
							!isMainWindowDupli &&
							isSameWindowDupli);
					if (correctPane1) {
						activeLeaf?.detach();
						workspace.revealLeaf(leaf);
					}
				}
			} else if ( // empty tabs
				noEmptyTabs &&
				leaf !== activeLeaf &&
				!activeLeafPath &&
				!leafPath &&
				(!isMainWindowActive || rootSplitActive) &&
				correctPane
			) {
				if (byWindow === "all") {
					leaf?.detach(); // to keep the new New tab
					if (activeLeaf) workspace.revealLeaf(activeLeaf);
				} else {
					const correctPane1 =
						(isMainWindowDupli && isMainWindowActive) ||
						(!isMainWindowActive &&
							!isMainWindowDupli &&
							isSameWindowDupli);
					if (correctPane1) {
						leaf?.detach();
						if (activeLeaf) workspace.revealLeaf(activeLeaf);
					}
				}
			}
		});
	}
}
