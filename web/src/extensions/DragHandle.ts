import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { NodeSelection } from "@tiptap/pm/state";

/**
 * DragHandle — adds a draggable grip icon next to top-level block nodes
 * so users can reorder blocks by dragging-and-dropping.
 *
 * Uses ProseMirror's built-in drag-and-drop handler: the handle sets a
 * NodeSelection on the block and ProseMirror handles the move on drop.
 */
export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("dragHandle");

    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const doc = state.doc;

            doc.descendants((node, pos) => {
              if (pos === 0) return true;
              if (node.isInline) return false;

              // Only top-level blocks (direct children of the document)
              const resolved = doc.resolve(pos);
              if (resolved.parent.type !== doc.type) return true;

              // Skip tables (they have their own complex structure)
              if (node.type.name === "table") return true;

              const decoration = Decoration.widget(
                pos,
                () => {
                  const grip = document.createElement("span");
                  grip.className = "drag-handle-grip";
                  grip.contentEditable = "false";
                  grip.draggable = true;
                  grip.setAttribute("aria-hidden", "true");
                  // Use vertical dots icon (grip)
                  grip.innerHTML = "⋮⋮";

                  grip.addEventListener("dragstart", (e: DragEvent) => {
                    const view = (grip as any).view as import("@tiptap/pm/view").EditorView;
                    if (!view) return;

                    const { state, dispatch } = view;

                    // Select the entire node at this position
                    const $pos = state.doc.resolve(pos + 1);
                    const nodeSelection = NodeSelection.create(state.doc, $pos.pos);
                    dispatch(state.tr.setSelection(nodeSelection));

                    // Let ProseMirror know this is a move
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                    grip.classList.add("dragging");
                  });

                  grip.addEventListener("dragend", () => {
                    grip.classList.remove("dragging");
                  });

                  return grip;
                },
                { key: `dh-${pos}`, side: -1 }
              );

              decorations.push(decoration);
              return false;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
