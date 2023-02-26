import { Plugin } from "obsidian";

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
		const activeLeaf = this.app.workspace.getLeaf();
		const activeLeafPath = activeLeaf.getViewState().state.file;

		app.workspace.iterateRootLeaves((leaf) => {
			if (
				leaf !== activeLeaf &&
				leaf.getViewState().state.file === activeLeafPath
			) {
				activeLeaf.detach();
			}
		});
	}
}
