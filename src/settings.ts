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
			.setName(
				"Close by window"
			)
			.setDesc("If turned ON, the plugin will only close similar tabs within the same window. If turned OFF, the plugin will check for duplicates throughout all open windows.")
			.addToggle((toggle) => {
				toggle
					// Create a toggle for the setting
					.setValue(this.plugin.settings.byWindow)
					.onChange((value) => {
						// Update the plugin setting when the toggle is changed
						this.plugin.settings.byWindow = value;
						this.plugin.saveSettings();
					});
			});
	}
}
