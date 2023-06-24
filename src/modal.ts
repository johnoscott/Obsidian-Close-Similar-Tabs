import { App, Modal, Setting } from "obsidian";
import DuplicateTabs from "./main";

export class CSTNewVersion extends Modal {
	constructor(app: App, public plugin: DuplicateTabs) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h1", { text: "Close Similar Tabs" });
		contentEl.createEl("h4", { text: "What's new:" });
		const content = `
        <ul>
            <li>Using "All windows" option (fixed), if you reopen a tab in a different window, duplicate tab closed.</li>

            <li>Opening a wikilink, without pressing CTRL, the page of the link replaced by the new link (default behavior), duplicate tab closed.</li>

			<li>Opening a link, pressing CTRL, existing duplicate tab is reopened.<li>

			<li>Notifications specifiy if "has been re-opened" or "already opened"</li>

			<li>New command: <b>"Quick switch"</b> to quickly switch Close Similar Tabs (not disabling the pluging)<li>
        </ul>
        `;
		contentEl.createDiv("", (el: HTMLDivElement) => {
			el.innerHTML = content;
		});
	}

	async onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.plugin.settings.savedVersion = this.plugin.manifest.version;
		await this.plugin.saveSettings();
	}
}

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
					.setValue(this.plugin.settings.toggleCloseSimilarTabs)
					.onChange((value) => {
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
