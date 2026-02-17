import type { TweetData, ExtensionSettings } from '@/types';
import { formatTweetAsMarkdown, generateFileName } from './markdown';

export async function exportToObsidian(
  tweet: TweetData,
  settings: ExtensionSettings,
  senderTabId?: number,
): Promise<{ success: boolean; error?: string }> {
  const markdown = formatTweetAsMarkdown(tweet, settings);
  const fileName = generateFileName(tweet, settings.fileNameTemplate);

  switch (settings.exportMethod) {
    case 'uri':
      return exportViaUri(markdown, fileName, settings, senderTabId);
    case 'rest-api':
      return exportViaRestApi(markdown, fileName, settings);
    case 'clipboard':
      return exportViaClipboard(markdown, senderTabId);
  }
}

function exportViaUri(
  markdown: string,
  fileName: string,
  settings: ExtensionSettings,
  senderTabId?: number,
): { success: boolean; error?: string } {
  const filePath = settings.savePath
    ? `${settings.savePath}/${fileName}`
    : fileName;

  const params = new URLSearchParams({
    vault: settings.vaultName,
    file: filePath,
    content: markdown,
  });

  const uri = `obsidian://new?${params.toString()}`;

  // Send URI to content script to open (custom protocols don't work via chrome.tabs.create)
  if (senderTabId) {
    chrome.tabs.sendMessage(senderTabId, { type: 'OPEN_URI', uri });
  }

  return { success: true };
}

async function exportViaRestApi(
  markdown: string,
  fileName: string,
  settings: ExtensionSettings,
): Promise<{ success: boolean; error?: string }> {
  const filePath = settings.savePath
    ? `${settings.savePath}/${fileName}.md`
    : `${fileName}.md`;

  const url = `https://localhost:${settings.restApiPort}/vault/${encodeURIComponent(filePath)}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/markdown',
        Authorization: `Bearer ${settings.restApiKey}`,
      },
      body: markdown,
    });

    if (!response.ok) {
      return { success: false, error: `REST API returned ${response.status}` };
    }
    return { success: true };
  } catch {
    return {
      success: false,
      error: 'REST API connection failed. Is the Obsidian Local REST API plugin running?',
    };
  }
}

async function exportViaClipboard(
  markdown: string,
  senderTabId?: number,
): Promise<{ success: boolean; error?: string }> {
  // clipboard API doesn't work in service worker, delegate to content script
  if (senderTabId) {
    chrome.tabs.sendMessage(senderTabId, {
      type: 'COPY_TO_CLIPBOARD',
      text: markdown,
    });
    return { success: true };
  }
  return { success: false, error: 'No active tab for clipboard access' };
}
