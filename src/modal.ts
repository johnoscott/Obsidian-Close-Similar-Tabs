import { App, Modal, Setting } from "obsidian";
import DuplicateTabs from "./main";

export class DuplicateTabsModal extends Modal {
	plugin: DuplicateTabs;

	constructor(app: App, plugin: DuplicateTabs) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h4", { text: "Close Similar Tabs Parameters" });
		new Setting(contentEl)
			.setName("Toggle Close Similar Tabs")
			.setDesc("Enable/disable Close Similar Tabs")
			.addToggle((toggle) => {
				toggle
					// Create a toggle for the setting
					.setValue(this.plugin.settings.toggleCloseSimilarTabs)
					.onChange((value) => {
						// Update the plugin setting when the toggle is changed
						this.plugin.settings.toggleCloseSimilarTabs = value;
						this.plugin.saveSettings();
					});
			});

		new Setting(contentEl)
			.setName("Close by window")
			.setDesc(
				"Select whether the plugin will only close similar tabs within the same window, or throughout all open windows."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOptions({
						current: "Current window only",
						all: "All windows",
					})
					.setValue(this.plugin.settings.byWindow)
					.onChange(async (value: "all" | "current") => {
						this.plugin.settings.byWindow = value;
						this.plugin.saveSettings();
					});
			});
		new Setting(contentEl)
			.setName("No empty tabs")
			.setDesc("Activates no several empty tabs")
			.addToggle((toggle) => {
				toggle
					// Create a toggle for the setting
					.setValue(this.plugin.settings.noEmptyTabs)
					.onChange((value) => {
						// Update the plugin setting when the toggle is changed
						this.plugin.settings.noEmptyTabs = value;
						this.plugin.saveSettings();
					});
			});
		new Setting(contentEl)
			.setName("Be Notified")
			.setDesc("open a notification pop up when a similar tab already exists")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.beNotified)
					.onChange((value) => {
						this.plugin.settings.beNotified = value;
						this.plugin.saveSettings();
					});
			});	
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
