import type { Message } from '@/types';
import { getSettings } from '@/utils/storage';
import { exportToObsidian } from '@/utils/obsidian';

export default defineBackground(() => {
  console.log('[X to Obsidian] Background service worker started');

  // Keyboard shortcut handler
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-selection') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            type: 'TOGGLE_SELECTION_MODE',
          } satisfies Message);
        }
      });
    }
  });

  // Extension icon click handler
  chrome.action.onClicked.addListener((tab) => {
    console.log('[X to Obsidian] Icon clicked, tab:', tab.id, tab.url);
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_SELECTION_MODE',
      } satisfies Message);
    }
  });

  // Message handler from content script
  chrome.runtime.onMessage.addListener((msg: Message, sender) => {
    if (msg.type === 'EXPORT_TWEET') {
      const tabId = sender.tab?.id;
      handleExport(msg.data, tabId).then((result) => {
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            type: 'EXPORT_RESULT',
            ...result,
          } satisfies Message);
        }
      });
    }

    if (msg.type === 'SELECTION_MODE_CHANGED') {
      const tabId = sender.tab?.id;
      if (tabId) {
        if (msg.active) {
          chrome.action.setBadgeText({ text: 'ON', tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#8B5CF6', tabId });
        } else {
          chrome.action.setBadgeText({ text: '', tabId });
        }
      }
    }
  });
});

async function handleExport(
  tweetData: import('@/types').TweetData,
  senderTabId?: number,
): Promise<{ success: boolean; error?: string }> {
  const settings = await getSettings();

  if (settings.exportMethod === 'uri' && !settings.vaultName) {
    return {
      success: false,
      error: 'Please set your Obsidian vault name in the extension settings.',
    };
  }

  return exportToObsidian(tweetData, settings, senderTabId);
}
