import { Notice, Plugin, Workspace, WorkspaceLeaf } from "obsidian";
import { DuplicateTabsSettingsTab } from "src/settings";
import { DuplicateTabsModal } from "./modal";

interface TabCessionsSettings {
	byWindow: "current" | "all";
	noEmptyTabs: boolean;
	toggleCloseSimilarTabs: boolean;
	beNotified: boolean;
}

const DEFAULT_SETTINGS: TabCessionsSettings = {
	byWindow: "current",
	noEmptyTabs: true,
	toggleCloseSimilarTabs: true,
	beNotified: true,
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

	// activeLeaf = last leaf created, removed when it's a duplicate
	findDuplicates() {
		const byWindow = this.settings.byWindow;
		const noEmptyTabs = this.settings.noEmptyTabs;
		// on what window active is
		const { workspace } = this.app;
		const activeLeaf = (workspace as any).activeLeaf;
		const activeView = activeLeaf.view;
		const isMainWindowActive = activeView?.containerEl.win == window;
		const rootSplitActive = activeLeaf.getRoot() == workspace.rootSplit;

		// get active relative path (folder?/name)
		const activeLeafPath = activeLeaf?.getViewState().state.file;
		const activeTitlePart = activeLeafPath?.split("/").pop().split(".")[0];
		const activetitle = activeView?.getDisplayText();
		const activeEl = (activeLeaf as any).parent.containerEl;

		if (
			activeView?.getDisplayText() !== "New tab" &&
			(!activeLeafPath || activeTitlePart !== activetitle)
		)
			return; // to allowed open linked view

		workspace.iterateAllLeaves((leaf) => {
			const leafEl = (leaf as any).parent.containerEl;
			if (activeEl !== leafEl) return;
			const leafState = leaf.getViewState();
			const leafPath = leafState.state.file;
			const leafTitle = leaf.getDisplayText();
			const leafTitlePart = leafPath?.split("/").pop().split(".")[0];
			if (
				activeView?.getDisplayText() !== "New tab" &&
				(!leafPath || leafTitlePart !== leafTitle)
			)
				return; // to allowed open linked view

			const isMainWindowDupli = leaf.view.containerEl.win == window;
			const isSameWindowDupli = leaf.view.containerEl.win == activeWindow;
			const rootSplitDupli = leaf.getRoot() == workspace.rootSplit;
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
					this.closeDuplicate(activeLeaf, workspace, leaf, leafPath)
				} else {
					const correctPane1 =
						(isMainWindowDupli && isMainWindowActive) ||
						(!isMainWindowActive &&
							!isMainWindowDupli &&
							isSameWindowDupli);
					if (correctPane1) {
						this.closeDuplicate(activeLeaf, workspace, leaf, leafPath)
					}
				}
			} else if (
				// empty tabs
				noEmptyTabs &&
				leaf !== activeLeaf &&
				leaf.view.getDisplayText() === "New tab" &&
				activeView?.getDisplayText() === "New tab" &&
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

	closeDuplicate(activeLeaf: WorkspaceLeaf, workspace: Workspace, leaf: WorkspaceLeaf, leafPath: string) {
		activeLeaf?.detach();
		workspace.revealLeaf(leaf);
		if (this.settings.beNotified) {
			new Notice(`"${leafPath}" already opened`);
		}
	}
}
