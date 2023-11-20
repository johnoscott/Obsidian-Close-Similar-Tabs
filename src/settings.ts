import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export class CSTSettingsTab extends PluginSettingTab {
	constructor(app: App, public plugin: MyPlugin) {
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
					.setValue(this.plugin.settings.switch)
					.onChange((value) => {
						this.plugin.settings.switch = value;
						this.plugin.saveSettings();
						const message = this.plugin.settings.switch
							? "Close similar tabs ON"
							: "Close similar tabs OFF";
						new Notice(`${message}`);
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
					.onChange(async (value: string) => {
						if (value === "all" || value === "current") {
							this.plugin.settings.byWindow = value;
							this.plugin.saveSettings();
						}
					});
			});

		containerEl.createEl("p", {
			text: `options about not having several empty tabs and pinned tabs are getting back soon`,
		});
	}
}
