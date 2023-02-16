import { Plugin, WorkspaceLeaf } from "obsidian";

export default class duplicateTabs extends Plugin {
	async onload() {
		app.workspace.onLayoutReady(() => {
			this.registerEvent(
				app.workspace.on("layout-change", () => {
					this.findDuplicates();
				})
			);
		});
	}

	findDuplicates() {
		const leafStates: { name: string; leaves: WorkspaceLeaf[] }[] = [];

		app.workspace.iterateAllLeaves((leaf) => {
			const mainWindow = leaf.view.containerEl.win == window;
			const sameWindow = leaf.view.containerEl.win == activeWindow;
			const rootSplit = leaf.getRoot() == this.app.workspace.rootSplit
			//Ignore sidebar panes in the main window, because non-main window don't have a sidebar
			const correctPane = mainWindow ? (sameWindow && rootSplit) : sameWindow;			
			const leafState = leaf.getViewState();
			const name = leafState.state.file;

			if (
				correctPane
			) {
				const existingLeaf = leafStates.find(
					(existingLeaf) => existingLeaf.name === name
				);
				if (existingLeaf && name) {
					existingLeaf.leaves.push(leaf);
				} else {
					leafStates.push({ name, leaves: [leaf] });
				}
			}
		});

		for (const obj of leafStates) {
			if (obj.leaves.length > 1) {
				obj.leaves[obj.leaves.length - 1].detach();
				this.app.workspace.revealLeaf(obj.leaves[0]);
			}
		}
	}
}
