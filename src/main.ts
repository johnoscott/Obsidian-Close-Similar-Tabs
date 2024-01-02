import {
	CSTSettings,
	Notice,
	Plugin,
	View,
	WorkspaceLeaf,
} from "obsidian";
import { openLinkWrapper } from "./open-link-wrapper";
import { openFileWrapper } from "./open-file-wrapper";
import { CSTSettingsTab } from "./settings";
import { Console, DEFAULT_SETTINGS } from "./constantes";

/* Enable Console.log or debug or turn them all to debug or log */
(global as any).DEBUG_ACTIVATED = false;      // if true, use Console instead of console
(global as any).FORCED_DEBUG_METHOD = "debug"
// "" → default, 
// "debug" → all Console.log turned into Console.debug, 
// "log" → all Console.debug turned into Console.log

export default class CST extends Plugin {
	settings: CSTSettings;
	link: boolean;
	ctrl: boolean;
	middleClick: boolean;

	async onload() {
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new CSTSettingsTab(this.app, this));
		this.link = false; // to prevent from running openFile when openLink already run

		this.registerDomEvent(document, "keydown", (e) => {
			if (e.key === 'Control' || e.key === 'Meta') {
				Console.debug("ctrl pressed")
				this.ctrl = true
			}
		})
		this.registerDomEvent(document, "keyup", (e) => {
			if (e.key === 'Control' || e.key === 'Meta') {
				Console.log("ctrl released")
				this.ctrl = false
			}
		})
		this.registerDomEvent(document, 'mouseup', (e) => {// strangly middle click detected when released
			if (e.button === 1) {
				Console.debug("middleClick released On")
				this.middleClick = true
				setTimeout(() => {
					Console.debug("middleClick released off")
					this.middleClick = false
				}, 200);
			}
		});


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

	// deprecated
	// getActiveLeaf(): WorkspaceLeaf | undefined {
	// 	return (this.app as any).workspace.activeLeaf;// in some conditions it remains better !
	// }

	// bad idea to use this, it's creating empty tabs, when no tabs
	// getLeaf(): WorkspaceLeaf | undefined {
	// 	return this.app.workspace.getLeaf(false);
	// }

	getVisibleLeaf(): WorkspaceLeaf | undefined {
		return this.app.workspace.getActiveViewOfType(View)?.leaf
	}

	getActiveFileView(): WorkspaceLeaf | undefined {
		return this.app.workspace.getActiveViewOfType(View)?.leaf
	}

	activeLeafInfo() {
		const getVisibleLeafPath = this.getVisibleLeaf()?.getDisplayText()
		const activeFileViewPath = this.getActiveFileView()?.getDisplayText()
		Console.debug("getVisibleLeaf: ", getVisibleLeafPath, " getActiveFileView: ", activeFileViewPath)
	}

	getLeafProperties(
		leaf: WorkspaceLeaf | undefined,
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
				if (this.getPinned(leaf)) isTherePin = true
				empties.push(leaf)
				return
			}

			if (this.getPinned(leaf)) isTherePin = true
			leaves.push(leaf);
		});
		return { leaves, empties, isTherePin };
	};

	getLeafPath(leaf: WorkspaceLeaf | undefined): string {
		return leaf?.getViewState().state.file
	}

	getPinned(leaf: WorkspaceLeaf) {
		return leaf?.getViewState().pinned;
	}

	isEmpty(leaf: WorkspaceLeaf | undefined) {
		return leaf?.view.getViewType() === "empty"
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

