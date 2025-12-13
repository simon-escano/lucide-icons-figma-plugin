// @ts-ignore
import * as iconNodesRaw from 'lucide-static/icon-nodes.json';
// @ts-ignore
import * as iconTagsRaw from 'lucide-static/tags.json';

// HANDLE DATA IMPORT:
const iconNodes = (iconNodesRaw as any).default || iconNodesRaw;
const iconTags = (iconTagsRaw as any).default || iconTagsRaw;

const COMPONENT_SET_KEY = "2e95241c43275cb8fff07552f3e0805c38e02ba3";

const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (clear) => clear.replace(/-/, "").toUpperCase());

// Helper: Safely build SVG string
const createSvgString = (iconNode: any) => {
  if (!Array.isArray(iconNode)) return '';

  let childrenToRender = [];

  // Check SVG data format (Root vs Children-only)
  if (typeof iconNode[0] === 'string' && iconNode[0] === 'svg') {
    childrenToRender = iconNode[2] || [];
  } else if (Array.isArray(iconNode[0])) {
    childrenToRender = iconNode;
  } else {
    return '';
  }

  const buildChildren = (kids: any[]): string => {
    if (!Array.isArray(kids)) return '';
    return kids.map((child) => {
      if (!Array.isArray(child)) return '';
      const [tag, attrs, nested] = child;
      const attributeString = Object.entries(attrs || {})
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      const nestedChildren = nested ? buildChildren(nested) : "";
      return `<${tag} ${attributeString}>${nestedChildren}</${tag}>`;
    }).join('');
  };

  const svgContent = buildChildren(childrenToRender);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>`;
};

// --- MAIN LIST GENERATION ---
const iconList = Object.keys(iconNodes).map((name) => {
  if (name === 'default' || name === '__esModule') return null;

  const node = iconNodes[name as keyof typeof iconNodes];
  const tagsEntry = iconTags[name as keyof typeof iconTags];

  let resolvedTags: string[] = [];
  let resolvedCategories: string[] = [];

  // ROBUST TAG EXTRACTION:
  if (Array.isArray(tagsEntry)) {
    // Scenario A: tags.json is simple { "icon": ["tag1", "tag2"] }
    resolvedTags = tagsEntry;
  } else if (typeof tagsEntry === 'object' && tagsEntry !== null) {
    // Scenario B: tags.json is detailed { "icon": { "tags": [], "categories": [] } }
    // @ts-ignore
    resolvedTags = tagsEntry.tags || [];
    // @ts-ignore
    resolvedCategories = tagsEntry.categories || [];
  }

  return {
    name: name,
    pascalName: toPascalCase(name),
    tags: resolvedTags,
    categories: resolvedCategories,
    svg: createSvgString(node)
  };
}).filter(item => item !== null);

figma.showUI(__html__, { width: 340, height: 500 });

// Send data to UI
figma.ui.postMessage({ type: 'load-icons', icons: iconList });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'insert-icon') {
    try {
      figma.notify(`Inserting ${msg.name}...`);
      
      const componentSet = await figma.importComponentSetByKeyAsync(COMPONENT_SET_KEY);
      const instance = componentSet.defaultVariant.createInstance();
      const properties = componentSet.variantGroupProperties;
      const propertyName = Object.keys(properties)[0]; 

      try {
        instance.setProperties({ [propertyName]: msg.name });
      } catch (err) {
        console.error("Variant switch failed:", err);
        figma.notify(`Error: Could not find variant '${msg.name}'`);
        instance.remove();
        return;
      }

      const selection = figma.currentPage.selection;
      if (selection.length > 0) {
        const target = selection[0];
        if ("appendChild" in target && !target.removed) {
          target.appendChild(instance);
          instance.x = (target.width / 2) - (instance.width / 2);
          instance.y = (target.height / 2) - (instance.height / 2);
        } else if (target.parent && "appendChild" in target.parent) {
          target.parent.appendChild(instance);
          instance.x = target.x + (target.width / 2) - (instance.width / 2);
          instance.y = target.y + (target.height / 2) - (instance.height / 2);
        }
      } else {
        instance.x = figma.viewport.center.x - (instance.width / 2);
        instance.y = figma.viewport.center.y - (instance.height / 2);
        figma.currentPage.appendChild(instance);
      }
      figma.currentPage.selection = [instance];
    } catch (error) {
      console.error(error);
      figma.notify("Failed to insert icon. See console.");
    }
  }
};