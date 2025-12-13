# Lucide Icons Figma Plugin

A compact Figma plugin for browsing and inserting Lucide icons with customizable appearance.

## Features

- 🌓 **Dark/Light Mode Toggle** - Switch between themes with persistent settings
- 📏 **Icon Size Slider** - Adjust icon preview size from 12px to 32px (default: 16px)
- 🎨 **Color Pickers** - Customize icon and background colors
- 🔍 **Search** - Filter icons by name or tags
- 💾 **Persistent Settings** - All preferences saved to localStorage

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the plugin:
   \`\`\`bash
   npm run build
   \`\`\`
   
   Or watch for changes:
   \`\`\`bash
   npm run watch
   \`\`\`

3. Load the plugin in Figma:
   - Open Figma Desktop
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file

## Usage

1. Open the plugin from Plugins menu
2. Use the controls at the top to:
   - Toggle between light/dark mode
   - Adjust icon preview size
   - Change icon color
   - Change background color
3. Search for icons in the search bar
4. Click any icon to insert it into your design

All settings are automatically saved and will persist across sessions.
