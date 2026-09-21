/**
 * Diagnostic & High-Reliability Certificate Printing & PDF Saving Utility
 * Renders ONLY the certificate in a single-page landscape layout without website chrome.
 */

export async function printCertificateElement(
  elementOrId: HTMLElement | string,
  certificateCode = 'IntelliGenZ-Certificate'
): Promise<boolean> {
  console.group(`[Print Diagnostic] Initiating Print / Save PDF for: ${certificateCode}`);
  
  try {
    // 1. Check click handler & target element
    console.log('[Print Diagnostic] Step 1: Resolving certificate target element...');
    const element =
      typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!element) {
      console.error(`[Print Diagnostic] Failed: Element '${elementOrId}' not found in DOM.`);
      console.groupEnd();
      window.print();
      return false;
    }

    const elId = typeof elementOrId === 'string' ? elementOrId : elementOrId?.id || 'unknown';
    console.log(`[Print Diagnostic] Step 2: Target element resolved (id: ${elId}, tag: ${element.tagName})`);

    // 2. Check element visibility and dimensions
    const rect = element.getBoundingClientRect();
    console.log(`[Print Diagnostic] Step 3: Element dimensions: width=${rect.width}px, height=${rect.height}px, visible=${rect.width > 0 && rect.height > 0}`);

    // 3. Ensure fonts are loaded
    console.log('[Print Diagnostic] Step 4: Checking document font readiness...');
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
        console.log('[Print Diagnostic] Step 4: All web fonts confirmed ready.');
      } catch (fontErr) {
        console.warn('[Print Diagnostic] Font readiness check warning:', fontErr);
      }
    }

    // 4. Ensure images/SVGs are rendered
    console.log('[Print Diagnostic] Step 5: Checking embedded images/vectors...');
    const images = element.querySelectorAll('img');
    const imagePromises: Promise<void>[] = [];
    images.forEach((img) => {
      if (!img.complete) {
        imagePromises.push(
          new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        );
      }
    });
    if (imagePromises.length > 0) {
      await Promise.all(imagePromises);
      console.log(`[Print Diagnostic] Step 5: Finished waiting for ${imagePromises.length} image(s).`);
    } else {
      console.log('[Print Diagnostic] Step 5: All vector graphics / icons are ready.');
    }

    // 5. Clean up any previous print roots
    const printRootId = 'active-print-certificate-container';
    const existing = document.getElementById(printRootId);
    if (existing) {
      existing.remove();
    }

    // 6. Build isolated direct-body print stage
    console.log('[Print Diagnostic] Step 6: Creating isolated print root on document.body...');
    const printContainer = document.createElement('div');
    printContainer.id = printRootId;
    printContainer.setAttribute('aria-hidden', 'true');

    // Clone the certificate node faithfully
    const clone = element.cloneNode(true) as HTMLElement;
    clone.id = `${element.id || 'cert'}-print-clone`;
    
    // Remove any interactive action buttons if present inside clone
    clone.querySelectorAll('button, input, form, .no-print').forEach((node) => node.remove());

    printContainer.appendChild(clone);
    document.body.appendChild(printContainer);

    // 7. Activate print styling flags on root elements
    document.documentElement.classList.add('is-printing-certificate');
    document.body.classList.add('is-printing-certificate');

    console.log('[Print Diagnostic] Step 7: Activated print mode on document root.');

    // 8. Set document title for default PDF filename
    const previousTitle = document.title;
    document.title = `Certificate_${certificateCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const cleanup = () => {
      console.log('[Print Diagnostic] Step 9: Running print cleanup...');
      document.documentElement.classList.remove('is-printing-certificate');
      document.body.classList.remove('is-printing-certificate');
      document.title = previousTitle;
      const stage = document.getElementById(printRootId);
      if (stage) {
        stage.remove();
      }
      window.removeEventListener('afterprint', cleanup);
      console.log('[Print Diagnostic] Print session finished cleanly.');
    };

    window.addEventListener('afterprint', cleanup, { once: true });

    // Fallback cleanup in case browser doesn't dispatch afterprint event
    setTimeout(cleanup, 60000);

    // 9. Execute native print
    console.log('[Print Diagnostic] Step 8: Triggering window.print()...');
    console.groupEnd();

    // Small microtask yield to allow DOM layout reflow
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          window.print();
        } catch (printErr) {
          console.error('[Print Diagnostic] window.print() error:', printErr);
          cleanup();
        }
      }, 50);
    });

    return true;
  } catch (err) {
    console.error('[Print Diagnostic] Fatal exception in printCertificateElement:', err);
    console.groupEnd();
    window.print();
    return false;
  }
}
