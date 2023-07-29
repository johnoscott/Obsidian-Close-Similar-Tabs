import { Notice, Plugin, Workspace, WorkspaceLeaf } from "obsidian";
import { DuplicateTabsSettingsTab } from "src/settings";
import { DuplicateTabsModal } from "./modal";

interface TabCessionsSettings {
	// savedVersion: string;
	byWindow: "current" | "all";
	noEmptyTabs: boolean;
	toggleCloseSimilarTabs: boolean;
	beNotified: boolean;
}

const DEFAULT_SETTINGS: TabCessionsSettings = {
	// savedVersion: "0.0.0",
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
		// if (
		// 	this.settings.savedVersion !== "0.0.0" && // if never installed false
		// 	this.settings.savedVersion !== this.manifest.version // if reinstall false
		// ) {
		// 	new CSTNewVersion(this.app, this).open();
		// } else {
		// 	this.settings.savedVersion = this.manifest.version;
		// }
		await this.saveSettings();

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.workspace.on(
					"layout-change",
					() => {
						console.log("layout-change")
						if (this.settings.toggleCloseSimilarTabs)
							this.findDuplicates();
					}
				)
			);
			this.registerEvent(
				this.app.workspace.on(
					"active-leaf-change",
					() => {
						console.log("active-leaf-change")
						if (this.settings.toggleCloseSimilarTabs)
							this.findDuplicates();
					}
				)
			);
		});

		this.addCommand({
			id: "close-similar-tabs-params",
			name: "Parameters",
			callback: () => {
				new DuplicateTabsModal(this.app, this).open();
			},
		});
		this.addCommand({
			id: "CST-quick-switch",
			name: "Quick switch",
			callback: async () => {
				this.settings.toggleCloseSimilarTabs =
					!this.settings.toggleCloseSimilarTabs;
				const message = this.settings.toggleCloseSimilarTabs
					? "Close similar tabs ON"
					: "Close similar tabs OFF";
				new Notice(`${message}`);
				await this.saveSettings();
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
	private findDuplicates = () => {
		const activeLeaf = this.app.workspace.getLeaf(false)
		const byWindow = this.settings.byWindow;
		const noEmptyTabs = this.settings.noEmptyTabs;
		// on what window active is
		const activeView = activeLeaf.view;
		const isMainWindowActive = activeView?.containerEl.win == window;
		const { workspace } = this.app;
		const rootSplitActive = activeLeaf.getRoot() == workspace.rootSplit;

		// get active relative path (folder?/name)
		const activeLeafPath = activeLeaf?.getViewState().state.file;
		const activeEl = (activeLeaf as any).parent.containerEl;

		workspace.iterateAllLeaves((leaf) => {
			const leafEl = (leaf as any).parent.containerEl;
			const leafPath = leaf.getViewState().state.file;
			const isSameWindowDupli = leaf.view.containerEl.win == activeWindow;
			const isMainWindowDupli = leaf.view.containerEl.win == window;

			if (leaf === activeLeaf) return;

			// to allowed open linked view
			if (isSameWindowDupli && activeEl !== leafEl) {
				return;
			}

			const rootSplitDupli = leaf.getRoot() == workspace.rootSplit;
			const correctPane =
				(isMainWindowDupli && rootSplitDupli) || !isMainWindowDupli;

			if (
				leafPath &&
				leafPath === activeLeafPath &&
				(!isMainWindowActive || rootSplitActive) &&
				correctPane
			) {
				if (!isSameWindowDupli && byWindow === "all") {
					this.closeDuplicate(
						activeLeaf,
						workspace,
						leaf,
						leafPath,
						false
					);
				} else {
					const correctPane1 =
						(isMainWindowDupli && isMainWindowActive) ||
						(!isMainWindowActive &&
							!isMainWindowDupli &&
							isSameWindowDupli);
					if (correctPane1) {
						this.closeDuplicate(
							activeLeaf,
							workspace,
							leaf,
							leafPath,
							true
						);
					}
				}
			} else if (
				// no empty tabs
				noEmptyTabs &&
				leaf.view.getViewType() === "empty" && // or leaf.view.getDisplayText() === "New tab"
				activeView.getViewType() === "empty" &&
				(!isMainWindowActive || rootSplitActive) &&
				correctPane
			) {
				leaf?.detach(); // to keep the new New tab
			}
		});
	};

	closeDuplicate(
		activeLeaf: WorkspaceLeaf,
		workspace: Workspace,
		leaf: WorkspaceLeaf,
		leafPath: string,
		isSameWindowDupli: boolean
	) {
		// when clicking on a link
		if (
			(activeLeaf as any).history.backHistory.length ||
			!isSameWindowDupli
		) {
			leaf.detach();
			if (this.settings.beNotified) {
				new Notice(`"${leafPath}" has been re-opened`);
			}
		} else {
			activeLeaf?.detach();
			workspace.revealLeaf(leaf);
			if (this.settings.beNotified) {
				new Notice(`"${leafPath}" already opened`);
			}
		}
	}
}
