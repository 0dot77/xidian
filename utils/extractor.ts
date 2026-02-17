import { SELECTORS } from './selectors';
import type { TweetData } from '@/types';

export async function extractTweetData(articleEl: HTMLElement): Promise<TweetData> {
  const userNameEl = articleEl.querySelector(SELECTORS.userName);
  const nameSpans = userNameEl?.querySelectorAll('span') ?? [];
  const name = nameSpans[0]?.textContent?.trim() ?? 'Unknown';
  const handle =
    Array.from(nameSpans)
      .find((s) => s.textContent?.startsWith('@'))
      ?.textContent?.trim() ?? '@unknown';

  const avatarImg = articleEl.querySelector(
    SELECTORS.avatarImage,
  ) as HTMLImageElement | null;
  const avatarUrl = avatarImg?.src ?? null;

  const textEl = articleEl.querySelector(SELECTORS.tweetText) as HTMLElement | null;
  let text = textEl?.innerText?.trim() ?? '';

  const timeEl = articleEl.querySelector(
    SELECTORS.timestamp,
  ) as HTMLTimeElement | null;
  const timestamp =
    timeEl?.getAttribute('datetime') ?? new Date().toISOString();

  const permalinkAnchor = timeEl?.closest('a');
  const tweetPath = permalinkAnchor?.getAttribute('href') ?? '';
  const url = tweetPath ? `https://x.com${tweetPath}` : '';
  const id = tweetPath.split('/').pop() ?? '';

  // Always try to get full text from the MAIN world cache.
  // The cache is populated by intercepting X's own API responses,
  // which contain the full text even for "Show more" tweets.
  if (id) {
    const fullText = await fetchFullTweetFromBridge(id);
    if (fullText) {
      text = fullText;
    }
  }

  const photoEls = articleEl.querySelectorAll(SELECTORS.tweetPhoto);
  const images: string[] = [];
  photoEls.forEach((photoEl) => {
    const img = photoEl.querySelector('img') as HTMLImageElement | null;
    if (img?.src && img.src.includes('pbs.twimg.com')) {
      const fullRes = img.src.replace(/name=\w+/, 'name=large');
      images.push(fullRes);
    }
  });

  let video: TweetData['video'] = null;
  const videoPlayerEl = articleEl.querySelector(SELECTORS.videoPlayer);
  if (videoPlayerEl) {
    const thumbnailImg = videoPlayerEl.querySelector(
      'img',
    ) as HTMLImageElement | null;
    video = {
      thumbnailUrl: thumbnailImg?.src ?? null,
      tweetUrl: url,
    };
  }

  const quoteTweet = extractQuoteTweet(articleEl);

  const getMetric = (selector: string): string => {
    const el = articleEl.querySelector(selector);
    return el?.getAttribute('aria-label')?.match(/\d[\d,]*/)?.[0] ?? '0';
  };

  const metrics = {
    replies: getMetric(SELECTORS.replyCount),
    reposts: getMetric(SELECTORS.retweetCount),
    likes: getMetric(SELECTORS.likeCount),
  };

  return {
    id,
    author: { name, handle, avatarUrl },
    text,
    timestamp,
    images,
    video,
    quoteTweet,
    metrics,
    url,
  };
}

/**
 * Ask the MAIN world bridge for the full tweet text from its cache.
 * The bridge intercepts X's own fetch responses and caches full_text by tweet ID.
 */
async function fetchFullTweetFromBridge(tweetId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const callbackId = `xto_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const handler = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data?.type === 'XTO_TWEET_RESULT' &&
        event.data?.callbackId === callbackId
      ) {
        window.removeEventListener('message', handler);
        clearTimeout(timer);
        resolve(event.data.text ?? null);
      }
    };

    window.addEventListener('message', handler);
    window.postMessage({ type: 'XTO_FETCH_TWEET', tweetId, callbackId });

    // Timeout: cache lookup is instant, but API fallback may take a few seconds
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 8000);
  });
}

function extractQuoteTweet(articleEl: HTMLElement): TweetData | null {
  const allTextEls = articleEl.querySelectorAll(SELECTORS.tweetText);
  if (allTextEls.length < 2) return null;

  const quoteTextEl = allTextEls[1] as HTMLElement;
  const quoteContainer = quoteTextEl.closest('[role="link"]');
  if (!quoteContainer) return null;

  const quoteText = quoteTextEl.innerText?.trim() ?? '';
  const quoteTimeEl = quoteContainer.querySelector(
    SELECTORS.timestamp,
  ) as HTMLTimeElement | null;
  const quoteTimestamp =
    quoteTimeEl?.getAttribute('datetime') ?? new Date().toISOString();

  const quoteNameSpans =
    quoteContainer.querySelectorAll('[dir="ltr"] > span') ?? [];
  const quoteName = quoteNameSpans[0]?.textContent?.trim() ?? 'Unknown';
  const quoteHandle =
    Array.from(quoteNameSpans)
      .find((s) => s.textContent?.startsWith('@'))
      ?.textContent?.trim() ?? '@unknown';

  const quotePermalink = quoteTimeEl?.closest('a');
  const quotePath = quotePermalink?.getAttribute('href') ?? '';
  const quoteUrl = quotePath ? `https://x.com${quotePath}` : '';

  return {
    id: quotePath.split('/').pop() ?? '',
    author: { name: quoteName, handle: quoteHandle, avatarUrl: null },
    text: quoteText,
    timestamp: quoteTimestamp,
    images: [],
    video: null,
    quoteTweet: null,
    metrics: null,
    url: quoteUrl,
  };
}
