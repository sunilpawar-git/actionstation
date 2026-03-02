/**
 * Rehype Plugins - AST-based transformations for TipTap-compatible HTML
 * Each plugin operates on the hast (HTML AST) tree, not on HTML strings.
 */
import type { Root, Element } from 'hast';
import { visit, SKIP } from 'unist-util-visit';

/** Tags whose whitespace-only text children should be stripped */
const BLOCK_CONTAINERS = new Set(['blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th']);

/** Tags that reset ordered list numbering (semantic section breaks) */
const OL_RESET_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'pre']);

/** Block-level tags that must NOT be wrapped inside <p> */
const BLOCK_LEVEL_TAGS = new Set(['ul', 'ol', 'blockquote', 'pre', 'div', 'table', 'hr']);

/**
 * Wraps bare list item content in <p> tags for TipTap compatibility.
 * TipTap's ListItem extension requires <li><p>text</p></li> structure.
 * Loose lists already have <p>, tight lists don't — this normalizes both.
 * Block-level children (nested lists, blockquotes) stay as siblings of <p>.
 */
export function rehypeWrapListItems() {
    return (tree: Root): void => {
        visit(tree, 'element', (node: Element) => {
            if (node.tagName !== 'li') return;
            const firstChild = node.children[0];
            if (firstChild?.type === 'element' && firstChild.tagName === 'p') return;

            // Partition children: inline content goes in <p>, block elements stay as siblings
            const inlineChildren: typeof node.children = [];
            const remaining: typeof node.children = [];
            let foundBlock = false;

            for (const child of node.children) {
                const isBlock = child.type === 'element' && BLOCK_LEVEL_TAGS.has(child.tagName);
                if (isBlock) foundBlock = true;
                if (foundBlock) {
                    remaining.push(child);
                } else {
                    inlineChildren.push(child);
                }
            }

            // Only wrap inline content in <p> when there's actual content to wrap.
            // An all-block <li> (e.g. <li><ul>...</ul></li>) must not get a spurious <p/>.
            if (inlineChildren.length > 0) {
                const pNode: Element = {
                    type: 'element',
                    tagName: 'p',
                    properties: {},
                    children: inlineChildren,
                };
                node.children = [pNode, ...remaining];
            } else {
                node.children = remaining;
            }
        });
    };
}

/**
 * Adds start="N" to sequential <ol> elements separated by non-heading content.
 * Fixes the AI pattern where numbered items are interrupted by bullet sub-lists,
 * creating separate <ol> elements that all display "1."
 */
export function rehypeFixOlContinuity() {
    return (tree: Root): void => {
        let runningCount = 0;

        for (const child of tree.children) {
            if (child.type !== 'element') continue;

            if (OL_RESET_TAGS.has(child.tagName)) {
                runningCount = 0;
                continue;
            }

            if (child.tagName !== 'ol') continue;

            const itemCount = child.children.filter(
                (c) => c.type === 'element' && c.tagName === 'li',
            ).length;

            if (runningCount > 0) {
                child.properties.start = runningCount + 1;
            }

            runningCount += itemCount;
        }
    };
}

/**
 * Unwraps <img> from surrounding <p> when <p> contains only an image.
 * TipTap's block-level Image extension (inline: false) requires <img> at
 * block level, not inside <p>. remark-rehype always wraps standalone images
 * in <p>. This plugin corrects that for TipTap compatibility.
 *
 * Only operates on root-level children. Paragraphs with mixed content untouched.
 */
export function rehypeUnwrapImages() {
    return (tree: Root): void => {
        const next: typeof tree.children = [];
        for (const child of tree.children) {
            const onlyChild = child.type === 'element' && child.tagName === 'p' && child.children.length === 1
                ? child.children[0]
                : undefined;
            if (onlyChild?.type === 'element' && onlyChild.tagName === 'img') {
                next.push(onlyChild);
            } else {
                next.push(child);
            }
        }
        tree.children = next;
    };
}

/**
 * Strips whitespace-only text nodes from block containers.
 * Unified/remark-rehype adds \n text nodes between block elements;
 * TipTap and existing tests expect compact HTML without these.
 * Skips <pre> to preserve code block formatting.
 */
export function rehypeCompact() {
    return (tree: Root): void => {
        // Strip whitespace from root level
        tree.children = tree.children.filter(
            (child) => !(child.type === 'text' && /^\s+$/.test(child.value)),
        );

        visit(tree, 'element', (node: Element) => {
            if (node.tagName === 'pre') return SKIP;
            if (!BLOCK_CONTAINERS.has(node.tagName)) return;

            node.children = node.children.filter(
                (child) => !(child.type === 'text' && /^\s+$/.test(child.value)),
            );
        });
    };
}
