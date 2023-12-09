import {
	Notice,
	Plugin,
	View,
	Workspace,
	WorkspaceLeaf,
} from "obsidian";
import { CSTSettingsTab } from "./settings";
import { openLinkWrapper } from "./open-link-wrapper";
import { openFileWrapper } from "./open-file-wrapper";

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
	ctrl: boolean

	async onload() {
		console.log("loading...")
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new CSTSettingsTab(this.app, this));
		this.link = false; // to prevent from running openFile when openLink already run

		this.registerDomEvent(document, "keydown", (e) => {
			if (e.key === 'Control' || e.key === 'Meta') {
				console.debug("ctrl pressed")
				this.ctrl = true
			}
		})
		this.registerDomEvent(document, "keyup", (e) => {
			if (e.key === 'Control' || e.key === 'Meta') {
				console.debug("ctrl released")
				this.ctrl = false
			}
		})

		this.register(openLinkWrapper(this));
		this.register(openFileWrapper(this)); /* createLeafInParent */
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


	delActive() {
		const activeLeaf = this.getActiveLeaf();
		activeLeaf?.detach();
	}

	getActiveLeaf() {
		return (app as any).workspace.activeLeaf;
	}
	
	getLeaf() {
		return (app as any).workspace.getLeaf();
	}

	getVisibleLeaf() {
		return app.workspace.getActiveViewOfType(View)?.leaf
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
		const isMainWindow = leaf?.view.containerEl.win === window;
		const rootSplit = leaf?.getRoot() === this.app.workspace.rootSplit;
		const el = (leaf as any)?.parentSplit.containerEl;
		if (notActive) {
			const isSameWindow = leaf?.view.containerEl.win == activeWindow;
			return { isMainWindow, rootSplit, el, isSameWindow };
		}
		return { isMainWindow, rootSplit, el };
	}

	getLeaves = (activeEl: HTMLElement): { leaves: WorkspaceLeaf[], empties: WorkspaceLeaf[], isTherePin: boolean } => {
		// if all windows set?
		const { workspace } = this.app;
		const leaves: WorkspaceLeaf[] = [];
		const empties: WorkspaceLeaf[] = [];
		let isTherePin = false
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
				(!isSameWindowDupli && this.settings.byWindow === "current") //not same window
			) {
				return;
			}
			if (this.isEmpty(leaf)) {
				// if (this.getPinned(leaf)) isTherePin = true
				if (leaf.getViewState().pinned) isTherePin = true
				empties.push(leaf)
				return
			}

			// if (this.getPinned(leaf)) isTherePin = true
			if (leaf.getViewState().pinned) isTherePin = true
			leaves.push(leaf);
		});
		return { leaves, empties, isTherePin };
	};

	getLeafPath(leaf: WorkspaceLeaf) {
		return leaf?.getViewState().state.file
	}

	getPinned(leaf: WorkspaceLeaf) {
		return leaf?.getViewState().pinned;
	}

	isEmpty(leaf: WorkspaceLeaf | undefined) {
		// return (leaf && leaf.view.getState.type === "empty")
		return leaf?.view.getViewType() === "empty"
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
