/**
 * getPortalRoot — Returns a dedicated DOM element for React portals.
 *
 * Looks for `<div id="portal-root">` in the document. If it doesn't exist
 * (e.g. in a test environment), it is created and appended to `document.body`.
 * This isolates portal content from the main React tree (`#root`) and
 * prevents third-party scripts from accidentally destroying portal nodes.
 */
export function getPortalRoot(): HTMLElement {
    let el = document.getElementById('portal-root');
    if (!el) {
        el = document.createElement('div');
        el.id = 'portal-root';
        document.body.appendChild(el);
    }
    return el;
}
