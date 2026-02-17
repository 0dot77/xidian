import { SELECTORS } from '@/utils/selectors';
import { extractTweetData } from '@/utils/extractor';
import { formatTweetAsMarkdown, generateFileName } from '@/utils/markdown';
import { getSettings } from '@/utils/storage';
import type { Message, ExtensionSettings, TweetData } from '@/types';

// Safe wrapper for chrome.runtime.sendMessage (MV3 service worker may be inactive)
function safeSendMessage(msg: Message) {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch {}
}

export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],

  main(ctx) {
    let selectionMode = false;
    let currentHighlight: HTMLElement | null = null;
    let overlayEl: HTMLDivElement | null = null;
    let badgeEl: HTMLDivElement | null = null;
    let toastTimeout: ReturnType<typeof setTimeout> | null = null;

    function createOverlay(): HTMLDivElement {
      const el = document.createElement('div');
      el.id = 'xto-overlay';
      el.style.cssText = `
        position: absolute;
        pointer-events: none;
        border: 2px solid rgba(139, 92, 246, 0.8);
        background: rgba(139, 92, 246, 0.06);
        border-radius: 12px;
        transition: all 150ms ease-out;
        z-index: 9999;
        display: none;
      `;
      document.body.appendChild(el);
      return el;
    }

    function createBadge(): HTMLDivElement {
      const el = document.createElement('div');
      el.id = 'xto-badge';
      el.innerHTML = '&#x1F3AF; Selection Mode';
      el.style.cssText = `
        position: fixed;
        top: 12px;
        right: 12px;
        padding: 8px 16px;
        background: rgba(139, 92, 246, 0.95);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        font-weight: 600;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        user-select: none;
        transition: opacity 200ms ease;
      `;
      el.addEventListener('click', () => toggleSelectionMode());
      document.body.appendChild(el);
      return el;
    }

    function showToast(message: string, isError = false) {
      const existing = document.getElementById('xto-toast');
      if (existing) existing.remove();
      if (toastTimeout) clearTimeout(toastTimeout);

      const toast = document.createElement('div');
      toast.id = 'xto-toast';
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 20px;
        background: ${isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(34, 197, 94, 0.95)'};
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        font-weight: 500;
        border-radius: 8px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: opacity 300ms ease;
      `;
      document.body.appendChild(toast);

      toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }

    // --- Export directly from content script ---
    async function handleExport(tweetData: TweetData) {
      try {
        const settings = await getSettings();
        const markdown = formatTweetAsMarkdown(tweetData, settings);
        const fileName = generateFileName(tweetData, settings.fileNameTemplate);

        switch (settings.exportMethod) {
          case 'uri': {
            if (!settings.vaultName) {
              showToast('Set vault name in extension options first', true);
              return;
            }
            const filePath = settings.savePath
              ? `${settings.savePath}/${fileName}`
              : fileName;

            // Use encodeURIComponent (not URLSearchParams) to avoid + for spaces
            const uri = `obsidian://new?vault=${encodeURIComponent(settings.vaultName)}&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(markdown)}`;

            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = uri;
            document.body.appendChild(iframe);
            setTimeout(() => {
              iframe.remove();
              showToast('Sent to Obsidian!');
            }, 1000);
            break;
          }
          case 'clipboard': {
            await navigator.clipboard.writeText(markdown);
            showToast('Copied to clipboard!');
            break;
          }
          case 'rest-api': {
            // REST API needs background due to CSP, delegate
            safeSendMessage({
              type: 'EXPORT_TWEET',
              data: tweetData,
            });
            return; // background will send EXPORT_RESULT
          }
        }
      } catch (err) {
        showToast(`Export failed: ${err}`, true);
      }
    }

    function onMouseMove(e: MouseEvent) {
      if (!selectionMode || !overlayEl) return;

      const target = e.target as HTMLElement;
      const tweetArticle = target.closest(SELECTORS.tweet) as HTMLElement | null;

      if (tweetArticle && tweetArticle !== currentHighlight) {
        currentHighlight = tweetArticle;
        const rect = tweetArticle.getBoundingClientRect();
        overlayEl.style.top = `${rect.top + window.scrollY}px`;
        overlayEl.style.left = `${rect.left + window.scrollX}px`;
        overlayEl.style.width = `${rect.width}px`;
        overlayEl.style.height = `${rect.height}px`;
        overlayEl.style.display = 'block';
      } else if (!tweetArticle) {
        overlayEl.style.display = 'none';
        currentHighlight = null;
      }
    }

    async function onClick(e: MouseEvent) {
      if (!selectionMode) return;

      const target = e.target as HTMLElement;
      const tweetArticle = target.closest(SELECTORS.tweet) as HTMLElement | null;

      if (tweetArticle) {
        e.preventDefault();
        e.stopPropagation();

        // Green flash feedback
        if (overlayEl) {
          overlayEl.style.borderColor = 'rgba(34, 197, 94, 0.9)';
          overlayEl.style.background = 'rgba(34, 197, 94, 0.1)';
          setTimeout(() => {
            if (overlayEl) {
              overlayEl.style.borderColor = 'rgba(139, 92, 246, 0.8)';
              overlayEl.style.background = 'rgba(139, 92, 246, 0.06)';
            }
          }, 400);
        }

        const tweetData = await extractTweetData(tweetArticle);

        // Export directly from content script
        handleExport(tweetData);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectionMode) {
        toggleSelectionMode();
      }
    }

    function toggleSelectionMode() {
      selectionMode = !selectionMode;

      if (selectionMode) {
        overlayEl = overlayEl ?? createOverlay();
        badgeEl = badgeEl ?? createBadge();
        badgeEl.style.display = 'block';
        document.addEventListener('mousemove', onMouseMove, true);
        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown, true);
      } else {
        if (overlayEl) overlayEl.style.display = 'none';
        if (badgeEl) badgeEl.style.display = 'none';
        currentHighlight = null;
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);
      }

      safeSendMessage({
        type: 'SELECTION_MODE_CHANGED',
        active: selectionMode,
      });
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((msg: Message) => {
      if (msg.type === 'TOGGLE_SELECTION_MODE') {
        toggleSelectionMode();
      }
      if (msg.type === 'EXPORT_RESULT') {
        if (msg.success) {
          showToast('Saved to Obsidian!');
        } else {
          showToast(msg.error ?? 'Export failed', true);
        }
      }
    });

    // Cleanup on context invalidation
    ctx.onInvalidated(() => {
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      overlayEl?.remove();
      badgeEl?.remove();
      document.getElementById('xto-toast')?.remove();
    });
  },
});
