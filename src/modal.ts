import { App, Modal, Notice, Setting } from "obsidian";
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
			.setName("Quick switch")
			.setDesc("Enable/disable Close Similar Tabs")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableCST)
					.onChange((value) => {
						this.plugin.settings.enableCST = value;
						this.plugin.saveSettings();
						const message = this.plugin.settings.enableCST
							? "Close similar tabs ON"
							: "Close similar tabs OFF";
						new Notice(`${message}`);
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
					.onChange(async (value: string) => {
						if (value === "all" || value === "current") {
							this.plugin.settings.byWindow = value;
							this.plugin.saveSettings();
						}
					});
			});
		new Setting(contentEl)
			.setName("No empty tabs")
			.setDesc("Activates no several empty tabs")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.noEmptyTabs)
					.onChange((value) => {
						this.plugin.settings.noEmptyTabs = value;
						this.plugin.saveSettings();
					});
			});
		new Setting(contentEl)
			.setName("Be Clearly Notified")
			.setDesc(
				"open a specific notification pop up, when a similar tab already exists"
			)
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
