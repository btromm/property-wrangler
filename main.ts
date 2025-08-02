import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, parseYaml, stringifyYaml } from 'obsidian';

interface YamlBulkEditorSettings {
	confirmDeletion: boolean;
	showPreview: boolean;
}

const DEFAULT_SETTINGS: YamlBulkEditorSettings = {
	confirmDeletion: true,
	showPreview: true
}

interface YamlProperty {
	key: string;
	value: any;
	file: TFile;
}

interface FileWithYaml {
	file: TFile;
	frontmatter: any;
	content: string;
}

export default class YamlBulkEditorPlugin extends Plugin {
	settings: YamlBulkEditorSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('edit-3', 'Properties Wrangler', () => {
			new YamlBulkEditorModal(this.app, this).open();
		});

		this.addCommand({
			id: 'open-yaml-bulk-editor',
			name: 'Open Properties Wrangler',
			callback: () => {
				new YamlBulkEditorModal(this.app, this).open();
			}
		});

		this.addSettingTab(new YamlBulkEditorSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getAllMarkdownFiles(): Promise<TFile[]> {
		return this.app.vault.getMarkdownFiles();
	}

	parseYamlFrontmatter(content: string): { frontmatter: any; body: string } {
		const frontmatterRegex = /^---\s*\n(.*?)\n---\s*\n(.*)/s;
		const match = content.match(frontmatterRegex);
		
		if (!match) {
			return { frontmatter: {}, body: content };
		}

		try {
			const frontmatter = parseYaml(match[1]) || {};
			const body = match[2];
			return { frontmatter, body };
		} catch (error) {
			// Don't log error details to console to reduce noise
			// Just return empty frontmatter and preserve original content
			return { frontmatter: {}, body: content };
		}
	}

	stringifyYamlFrontmatter(frontmatter: any, body: string): string {
		if (!frontmatter || Object.keys(frontmatter).length === 0) {
			return body;
		}

		const yamlString = stringifyYaml(frontmatter).trim();
		return `---\n${yamlString}\n---\n${body}`;
	}

	async searchProperties(searchKey: string, searchValue?: string): Promise<YamlProperty[]> {
		const files = await this.getAllMarkdownFiles();
		const results: YamlProperty[] = [];
		const skippedFiles: string[] = [];

		for (const file of files) {
			try {
				const content = await this.app.vault.read(file);
				const { frontmatter } = this.parseYamlFrontmatter(content);

				if (frontmatter && typeof frontmatter === 'object') {
					// Check if frontmatter is empty due to parsing errors
					if (Object.keys(frontmatter).length === 0 && content.includes('---')) {
						skippedFiles.push(file.path);
						continue;
					}

					for (const [key, value] of Object.entries(frontmatter)) {
						if (key === searchKey) {
							if (!searchValue || value === searchValue) {
								results.push({ key, value, file });
							}
						}
					}
				}
			} catch (error) {
				// File reading error, not YAML parsing error
				skippedFiles.push(file.path);
			}
		}

		// Store skipped files count for UI feedback
		(this as any)._lastSkippedFilesCount = skippedFiles.length;

		return results;
	}

	async replacePropertyValue(searchKey: string, oldValue: string, newValue: string): Promise<number> {
		const properties = await this.searchProperties(searchKey, oldValue);
		let modifiedCount = 0;

		for (const prop of properties) {
			try {
				const content = await this.app.vault.read(prop.file);
				const { frontmatter, body } = this.parseYamlFrontmatter(content);

				if (frontmatter && frontmatter[searchKey] === oldValue) {
					frontmatter[searchKey] = newValue;
					const newContent = this.stringifyYamlFrontmatter(frontmatter, body);
					await this.app.vault.modify(prop.file, newContent);
					modifiedCount++;
				}
			} catch (error) {
				console.error(`Error modifying file ${prop.file.path}:`, error);
			}
		}

		return modifiedCount;
	}

	async deleteProperty(searchKey: string): Promise<number> {
		const properties = await this.searchProperties(searchKey);
		const uniqueFiles = new Set(properties.map(p => p.file));
		let modifiedCount = 0;

		for (const file of uniqueFiles) {
			try {
				const content = await this.app.vault.read(file);
				const { frontmatter, body } = this.parseYamlFrontmatter(content);

				if (frontmatter && frontmatter.hasOwnProperty(searchKey)) {
					delete frontmatter[searchKey];
					const newContent = this.stringifyYamlFrontmatter(frontmatter, body);
					await this.app.vault.modify(file, newContent);
					modifiedCount++;
				}
			} catch (error) {
				console.error(`Error modifying file ${file.path}:`, error);
			}
		}

		return modifiedCount;
	}
}

class YamlBulkEditorModal extends Modal {
	plugin: YamlBulkEditorPlugin;

	constructor(app: App, plugin: YamlBulkEditorPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Properties Wrangler' });

		const tabContainer = contentEl.createDiv('yaml-editor-tabs');
		
		const searchTab = tabContainer.createEl('button', { text: 'Search & Replace' });
		const deleteTab = tabContainer.createEl('button', { text: 'Delete Properties' });

		searchTab.addClass('yaml-tab-active');

		const contentContainer = contentEl.createDiv('yaml-editor-content');

		const showSearchReplace = () => {
			searchTab.addClass('yaml-tab-active');
			deleteTab.removeClass('yaml-tab-active');
			contentContainer.empty();
			this.createSearchReplaceInterface(contentContainer);
		};

		const showDelete = () => {
			deleteTab.addClass('yaml-tab-active');
			searchTab.removeClass('yaml-tab-active');
			contentContainer.empty();
			this.createDeleteInterface(contentContainer);
		};

		searchTab.onclick = showSearchReplace;
		deleteTab.onclick = showDelete;

		showSearchReplace();
	}

	createSearchReplaceInterface(container: HTMLElement) {
		container.createEl('h3', { text: 'Search and Replace Property Values' });

		const form = container.createDiv('yaml-form');

		new Setting(form)
			.setName('Property Key')
			.setDesc('The YAML property key to search for (e.g., "category")')
			.addText(text => {
				text.setPlaceholder('category');
				text.inputEl.id = 'search-key';
			});

		new Setting(form)
			.setName('Current Value')
			.setDesc('The current value to replace (leave empty to see all values for this key)')
			.addText(text => {
				text.setPlaceholder('Literature');
				text.inputEl.id = 'current-value';
			});

		new Setting(form)
			.setName('New Value')
			.setDesc('The new value to replace with (e.g., "Papers" or "[[Literature]]")')
			.addText(text => {
				text.setPlaceholder('[[Literature]]');
				text.inputEl.id = 'new-value';
			});

		const buttonContainer = form.createDiv('yaml-button-container');

		const searchButton = buttonContainer.createEl('button', { text: 'Preview Changes' });
		const replaceButton = buttonContainer.createEl('button', { text: 'Replace All' });
		replaceButton.addClass('mod-cta');

		const resultsContainer = container.createDiv('yaml-results');

		searchButton.onclick = async () => {
			const searchKey = (document.getElementById('search-key') as HTMLInputElement).value;
			const currentValue = (document.getElementById('current-value') as HTMLInputElement).value;

			if (!searchKey) {
				new Notice('Please enter a property key to search for');
				return;
			}

			const properties = await this.plugin.searchProperties(searchKey, currentValue || undefined);
			const skippedCount = (this.plugin as any)._lastSkippedFilesCount || 0;
			
			// Show results with skipped files info if any
			if (skippedCount > 0) {
				new Notice(`Found ${properties.length} properties. ${skippedCount} files skipped due to YAML parsing errors.`, 4000);
			}
			
			this.displaySearchResults(resultsContainer, properties);
		};

		replaceButton.onclick = async () => {
			const searchKey = (document.getElementById('search-key') as HTMLInputElement).value;
			const currentValue = (document.getElementById('current-value') as HTMLInputElement).value;
			const newValue = (document.getElementById('new-value') as HTMLInputElement).value;

			if (!searchKey || !currentValue || !newValue) {
				new Notice('Please fill in all fields for replacement');
				return;
			}

			if (currentValue === newValue) {
				new Notice('Current value and new value are the same');
				return;
			}

			const modifiedCount = await this.plugin.replacePropertyValue(searchKey, currentValue, newValue);
			new Notice(`Replaced "${searchKey}: ${currentValue}" with "${newValue}" in ${modifiedCount} files`);
			resultsContainer.empty();
		};
	}

	createDeleteInterface(container: HTMLElement) {
		container.createEl('h3', { text: 'Delete Property from All Files' });

		const form = container.createDiv('yaml-form');

		new Setting(form)
			.setName('Property Key')
			.setDesc('The YAML property key to delete from all files')
			.addText(text => {
				text.setPlaceholder('unwanted-property');
				text.inputEl.id = 'delete-key';
			});

		const buttonContainer = form.createDiv('yaml-button-container');

		const previewButton = buttonContainer.createEl('button', { text: 'Preview Deletion' });
		const deleteButton = buttonContainer.createEl('button', { text: 'Delete Property' });
		deleteButton.addClass('mod-warning');

		const resultsContainer = container.createDiv('yaml-results');

		previewButton.onclick = async () => {
			const searchKey = (document.getElementById('delete-key') as HTMLInputElement).value;

			if (!searchKey) {
				new Notice('Please enter a property key to search for');
				return;
			}

			const properties = await this.plugin.searchProperties(searchKey);
			const skippedCount = (this.plugin as any)._lastSkippedFilesCount || 0;
			
			// Show results with skipped files info if any
			if (skippedCount > 0) {
				new Notice(`Found ${properties.length} properties to delete. ${skippedCount} files skipped due to YAML parsing errors.`, 4000);
			}
			
			this.displaySearchResults(resultsContainer, properties, true);
		};

		deleteButton.onclick = async () => {
			const searchKey = (document.getElementById('delete-key') as HTMLInputElement).value;

			if (!searchKey) {
				new Notice('Please enter a property key to delete');
				return;
			}

			if (this.plugin.settings.confirmDeletion) {
				const properties = await this.plugin.searchProperties(searchKey);
				const confirmed = confirm(`Are you sure you want to delete the property "${searchKey}" from ${properties.length} occurrences across ${new Set(properties.map(p => p.file.path)).size} files? This action cannot be undone.`);
				
				if (!confirmed) {
					return;
				}
			}

			const modifiedCount = await this.plugin.deleteProperty(searchKey);
			new Notice(`Deleted property "${searchKey}" from ${modifiedCount} files`);
			resultsContainer.empty();
		};
	}

	displaySearchResults(container: HTMLElement, properties: YamlProperty[], isDelete = false) {
		container.empty();

		if (properties.length === 0) {
			container.createEl('p', { text: 'No properties found matching your search criteria.' });
			return;
		}

		const uniqueFiles = new Set(properties.map(p => p.file.path)).size;
		const header = container.createEl('h4', { 
			text: isDelete 
				? `Found ${properties.length} occurrences in ${uniqueFiles} files to delete:`
				: `Found ${properties.length} occurrences in ${uniqueFiles} files:`
		});

		const resultsList = container.createDiv('yaml-results-list');
		resultsList.style.maxHeight = '300px';
		resultsList.style.overflowY = 'auto';
		resultsList.style.border = '1px solid var(--background-modifier-border)';
		resultsList.style.borderRadius = '4px';
		resultsList.style.padding = '8px';

		for (const prop of properties) {
			const item = resultsList.createDiv('yaml-result-item');
			item.style.padding = '4px 0';
			item.style.borderBottom = '1px solid var(--background-modifier-border-hover)';

			const fileLink = item.createEl('strong');
			fileLink.textContent = prop.file.path;
			fileLink.style.color = 'var(--text-accent)';

			item.createEl('br');
			
			const valueText = item.createEl('span');
			valueText.textContent = `${prop.key}: ${JSON.stringify(prop.value)}`;
			valueText.style.fontFamily = 'var(--font-monospace)';
			valueText.style.fontSize = '0.9em';
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class YamlBulkEditorSettingTab extends PluginSettingTab {
	plugin: YamlBulkEditorPlugin;

	constructor(app: App, plugin: YamlBulkEditorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Properties Wrangler Settings' });

		new Setting(containerEl)
			.setName('Confirm deletion')
			.setDesc('Show confirmation dialog before deleting properties')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.confirmDeletion)
				.onChange(async (value) => {
					this.plugin.settings.confirmDeletion = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show preview')
			.setDesc('Show preview of changes before applying them')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showPreview)
				.onChange(async (value) => {
					this.plugin.settings.showPreview = value;
					await this.plugin.saveSettings();
				}));
	}
}
