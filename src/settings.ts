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
		const content = `
		<p>
		Repository: 🌴 <a href="https://github.com/1C0D/Obsidian-Close-Similar-Tabs">1C0D/Obsidian-Close-Similar-Tabs</a> 🌴
		</p>
		`;

		containerEl.createDiv("", (el: HTMLDivElement) => {
			el.innerHTML = content;
		});
		
		new Setting(containerEl)
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
		new Setting(containerEl)
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

		new Setting(containerEl)
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

		containerEl.createEl("p", {
			text: `2 commands: "Close Similar Tabs parameters" to directly change parameters, from the editor 
			and "Quick switch" to temporarly enable/disable Close Similar Tabs.,`
		});
	}
}
