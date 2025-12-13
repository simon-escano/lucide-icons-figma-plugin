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
  if (Array.isArray(tagsEntry)) {
    resolvedTags = tagsEntry;
  } else if (typeof tagsEntry === 'object' && tagsEntry !== null) {
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

figma.ui.postMessage({ type: 'load-icons', icons: iconList });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'insert-icon') {
    try {
      const selection = figma.currentPage.selection;
      
      // 1. IMPORT COMPONENT SET
      const componentSet = await figma.importComponentSetByKeyAsync(COMPONENT_SET_KEY);
      const variantProps = componentSet.variantGroupProperties;
      const propertyName = Object.keys(variantProps)[0]; // e.g. "Icon" or "Property 1"

      // 2. CHECK FOR REPLACEMENT (Swap existing icon)
      if (selection.length === 1 && selection[0].type === 'INSTANCE') {
        const target = selection[0] as InstanceNode;
        // Check if the selected instance belongs to our Lucide library
        // We check the parent (ComponentSet) key or the MainComponent key
        const mainComponent = await target.getMainComponentAsync();
        const parentSet = mainComponent?.parent;
        
        // If it matches our Lucide Component Set
        if (parentSet && parentSet.key === COMPONENT_SET_KEY) {
           figma.notify(`Swapping to ${msg.name}...`);
           try {
             // Changing properties preserves size and color overrides automatically
             target.setProperties({ [propertyName]: msg.name });
             return; // Done! No need to create new icon
           } catch (e) {
             console.error("Swap failed", e);
             // If swap fails, fall through to standard insert
           }
        }
      }

      // 3. CREATE NEW ICON INSTANCE
      figma.notify(`Inserting ${msg.name}...`);
      const instance = componentSet.defaultVariant.createInstance();
      try {
        instance.setProperties({ [propertyName]: msg.name });
      } catch (err) {
        figma.notify(`Error: Could not find variant '${msg.name}'`);
        instance.remove();
        return;
      }

      // 4. SMART PLACEMENT
      if (selection.length > 0) {
        const target = selection[0];

        // SCENARIO A: Target is a Container (Frame/Group) AND NOT an Instance
        // (We cannot append children to an Instance)
        if (
          (target.type === "FRAME" || target.type === "GROUP" || target.type === "SECTION") &&
          target.type !== "INSTANCE"
        ) {
           // Double check we aren't inside an instance logic (handled by try-catch below)
           try {
             target.appendChild(instance);
             instance.x = (target.width / 2) - (instance.width / 2);
             instance.y = (target.height / 2) - (instance.height / 2);
             target.appendChild(instance); // Ensure it's added
           } catch (e) {
             // If append fails (e.g. target is inside an instance), fall back to sibling
             placeBeside(target, instance);
           }
        } 
        // SCENARIO B: Target is a regular node (or we can't append inside)
        else {
          placeBeside(target, instance);
        }
      } else {
        // SCENARIO C: Nothing selected -> Center in Viewport
        instance.x = figma.viewport.center.x - (instance.width / 2);
        instance.y = figma.viewport.center.y - (instance.height / 2);
        figma.currentPage.appendChild(instance);
      }

      figma.currentPage.selection = [instance];

    } catch (error: any) {
      console.error(error);
      // Nice error handling for the "Instance" restriction
      if (error.message && error.message.includes("New parent is an instance")) {
        figma.notify("Cannot place icon inside a component instance.");
      } else {
        figma.notify("Failed to insert icon.");
      }
    }
  }
};

// Helper: Place icon BESIDE the target (Sibling)
function placeBeside(target: SceneNode, instance: SceneNode) {
  const parent = target.parent;
  
  if (parent && parent.type !== "INSTANCE" && parent.type !== "mainComponent") {
    // Append to same parent
    parent.appendChild(instance);
    
    // Position to the RIGHT of the target with 8px gap
    instance.x = target.x + target.width + 8;
    
    // Vertically Center relative to target
    instance.y = target.y + (target.height / 2) - (instance.height / 2);
  } else {
    // Fallback: If parent is locked/instance, put in root Page center
    figma.notify("Cannot place inside this selection. Placing in center.");
    instance.x = figma.viewport.center.x - (instance.width / 2);
    instance.y = figma.viewport.center.y - (instance.height / 2);
    figma.currentPage.appendChild(instance);
  }
}