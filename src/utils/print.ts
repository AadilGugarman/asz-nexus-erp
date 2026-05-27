/**
 * print.ts — Reliable single-invoice print utility
 *
 * Strategy:
 *   1. Add `erp-printing` class to <body> — CSS hides everything except
 *      the element marked with `data-print-target`.
 *   2. Add `data-print-target` attribute to the invoice paper div.
 *   3. Call window.print().
 *   4. Remove both attributes after the dialog closes.
 *
 * This keeps the real React DOM intact (no cloning), so all Tailwind
 * classes, inline styles, and SVGs render exactly as on screen.
 */

export function printElement(node: HTMLElement): void {
  // Mark the target element
  node.setAttribute('data-print-target', 'true');
  // Tell body we are printing
  document.body.classList.add('erp-printing');

  window.print();

  // Clean up — afterprint fires when dialog closes/cancels
  const cleanup = () => {
    node.removeAttribute('data-print-target');
    document.body.classList.remove('erp-printing');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  // Fallback cleanup in case afterprint doesn't fire (some browsers)
  setTimeout(cleanup, 3000);
}
