# Properties Wrangler

A powerful Obsidian plugin for bulk editing, replacing, and deleting YAML frontmatter properties across your entire vault.

**BACKUP YOUR VAULT BEFORE USING THIS PLUGIN!**

This plugin was entirely vibe-coded with an LLM. I am not liable for any data loss, corruption, or other issues that may arise from using this plugin.

## Features

- **Search & Replace**: Find and replace property values across all markdown files in your vault
- **Bulk Delete**: Remove specific properties from all files that contain them
- **Preview Changes**: See exactly which files and properties will be affected before making changes
- **Error Handling**: Gracefully handles files with problematic YAML syntax
- **User-Friendly Interface**: Clean, tabbed interface with confirmation dialogs

## Installation

### Option 1: Using BRAT (Recommended)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's Community Plugins
2. Enable BRAT in your plugin settings
3. Open the command palette (`Ctrl/Cmd + P`) and run the command "BRAT: Add a beta plugin for testing"
4. Enter this repository URL: `https://github.com/YOUR_USERNAME/properties-wrangler`
5. Click "Add Plugin" and wait for BRAT to install it
6. Go to Settings → Community Plugins and enable "Properties Wrangler"

### Option 2: Manual Installation

1. Download the latest release files (`main.js`, `manifest.json`, and `styles.css`) from the [releases page](https://github.com/YOUR_USERNAME/properties-wrangler/releases)
2. Navigate to your vault's `.obsidian/plugins/` directory
   - On Windows: `C:\Users\YourName\Documents\YourVaultName\.obsidian\plugins\`
   - On Mac: `/Users/YourName/Documents/YourVaultName/.obsidian/plugins/`
   - On Linux: `/home/YourName/Documents/YourVaultName/.obsidian/plugins/`
3. Create a new folder called `yaml-bulk-editor`
4. Copy the downloaded files into this folder
5. Restart Obsidian or reload the plugins
6. Go to Settings → Community Plugins and enable "Properties Wrangler"

## Usage

### Opening the Plugin

You can access Properties Wrangler in three ways:
1. Click the pencil icon in the ribbon (left sidebar)
2. Use the command palette (`Ctrl/Cmd + P`) and search for "Open Properties Wrangler"
3. Use the hotkey if you've assigned one in Settings → Hotkeys

### Search & Replace Properties

1. Open Properties Wrangler and select the "Search & Replace" tab
2. Enter the **Property Key** you want to search for (e.g., "category", "tags", "status")
3. Enter the **Current Value** you want to replace (leave blank to see all values for that property)
4. Enter the **New Value** you want to replace it with
5. Click **Preview Changes** to see which files will be affected
6. Click **Replace All** to perform the bulk replacement

**Example Use Cases:**
- Change `category: Literature` to `category: [[Literature]]` across all files
- Update `status: draft` to `status: published` for multiple notes
- Replace old tag names with new ones

### Delete Properties

1. Select the "Delete Properties" tab
2. Enter the **Property Key** you want to delete from all files
3. Click **Preview Deletion** to see which files contain this property
4. Click **Delete Property** to remove it from all affected files

**Example Use Cases:**
- Remove deprecated properties like `old-category`
- Clean up automatically generated properties you no longer need
- Remove test properties added during experimentation

### Preview Feature

The preview feature shows you:
- How many properties match your search criteria
- Which files contain the properties
- The current values of those properties
- How many files will be skipped due to YAML parsing errors

### Error Handling

The plugin gracefully handles files with problematic YAML syntax by:
- Skipping files that can't be parsed
- Continuing to process valid files
- Notifying you how many files were skipped
- Logging detailed errors to the console for debugging

## Settings

Access plugin settings through Settings → Community Plugins → Properties Wrangler → ⚙️

- **Confirm deletion**: Show confirmation dialog before deleting properties (default: enabled)
- **Show preview**: Show preview of changes before applying them (default: enabled)

## Troubleshooting

### Files Being Skipped

If you see messages about files being skipped due to YAML parsing errors, this typically means:
- Files contain compact YAML mappings like `{key: value, nested: {key: value}}`
- Duplicate property keys in the frontmatter
- Indentation issues in the YAML
- Template syntax or special characters that break YAML parsing

These files are safely skipped and won't cause the plugin to crash.

### No Properties Found

If your search returns no results:
- Check that you're using the exact property key name (case-sensitive)
- Ensure your files actually have YAML frontmatter (content between `---` markers)
- Try leaving the "Current Value" field blank to see all values for that property

## Development

This plugin is built with:
- TypeScript
- Obsidian API
- esbuild for bundling

To build from source:
```bash
npm install
npm run build
```

## Support

If you encounter issues, ask an LLM. I am providing this solely for any menial benefit that it may have for you, and will not be maintaining this actively.

## License

MIT License - see LICENSE file for details.

## Changelog

### v0.1.0 (Beta)
- Initial release
- Search and replace functionality
- Bulk delete functionality
- Preview changes feature
- Error handling for problematic YAML files
- Settings panel with confirmation options
