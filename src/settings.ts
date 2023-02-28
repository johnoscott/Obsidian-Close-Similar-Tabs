import { App, PluginSettingTab, Setting } from "obsidian";
import DuplicateTabs from "src/main";

export class DuplicateTabsSettingsTab extends PluginSettingTab {
	plugin: DuplicateTabs;

	constructor(app: App, plugin: DuplicateTabs) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h1", { text: "Close Similar Tabs" });
		const linkText = containerEl.createEl("span", {
			text: " 🌴",
		});
		const linkContainer = containerEl.createEl("p", {
			text: "Repository: 🌴 ",
		});
		linkContainer.createEl("a", {
			text: "1C0D/Obsidian-Close-Similar-Tabs",
			href: "https://github.com/1C0D/Obsidian-Close-Similar-Tabs",
		});
		linkContainer.appendChild(linkText);

		new Setting(containerEl)
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
	}
}
