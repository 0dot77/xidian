/**
 * MAIN world content script — runs in the page's JS context at document_start.
 *
 * Two strategies for getting full tweet text:
 *
 * 1. PASSIVE CACHE: Intercept X's own fetch responses and cache tweet data.
 *    If the timeline response includes note_tweet, we get the full text for free.
 *
 * 2. ACTIVE FETCH (fallback): If cache misses or only has truncated text,
 *    make a GraphQL TweetResultByRestId call. The query hash is extracted
 *    PROACTIVELY from X's JS bundles at page load so it's ready immediately.
 */
export default defineContentScript({
  matches: ['*://x.com/*', '*://twitter.com/*'],
  world: 'MAIN',
  runAt: 'document_start',

  main() {
    const tweetTextCache = new Map<string, string>();
    const MAX_CACHE_SIZE = 1000;

    // Captured GraphQL query hashes and features from X's own requests
    const graphqlInfo = new Map<string, { hash: string; features: string }>();
    let fallbackFeatures: string | null = null;

    // Pre-resolved hash from JS bundle scan (ready before first user click)
    let preScannedHash: string | null = null;
    let hashScanPromise: Promise<string | null> | null = null;

    const BEARER =
      'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

    const originalFetch = window.fetch;

    // ========================================================
    // 1. PROACTIVE HASH SCAN — start as soon as scripts appear
    // ========================================================
    // Watch for <script> tags being added and scan them immediately.
    // This way the hash is ready BEFORE the user clicks anything.
    const scannedSrcs = new Set<string>();

    function scanScriptElement(el: HTMLScriptElement): void {
      const src = el.src;
      if (!src || scannedSrcs.has(src)) return;
      if (!src.includes('twimg.com') && !src.includes('x.com')) return;
      scannedSrcs.add(src);

      // Don't block — scan in background
      originalFetch(src)
        .then((resp) => resp.text())
        .then((text) => {
          // Look for TweetResultByRestId hash
          if (!preScannedHash) {
            const match = text.match(
              /queryId:"([^"]+)"[^}]{0,80}operationName:"TweetResultByRestId"/,
            );
            if (match) {
              preScannedHash = match[1];
            }
          }

          // Also capture ANY features object from the bundle as fallback
          if (!fallbackFeatures) {
            const featMatch = text.match(
              /longform_notetweets_consumption_enabled[^}]+}/,
            );
            if (featMatch) {
              try {
                // Extract the full JSON object containing this key
                const start = text.lastIndexOf('{', text.indexOf(featMatch[0]));
                const sub = text.slice(start);
                const end = sub.indexOf('}') + 1;
                const candidate = sub.slice(0, end);
                JSON.parse(candidate); // validate
                fallbackFeatures = candidate;
              } catch {}
            }
          }
        })
        .catch(() => {});
    }

    // Observe new <script> tags as they're added to the DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if ((node as Element)?.tagName === 'SCRIPT') {
            scanScriptElement(node as HTMLScriptElement);
          }
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Also scan any scripts already in the DOM (for late injection)
    function scanExistingScripts(): void {
      document.querySelectorAll('script[src]').forEach((el) => {
        scanScriptElement(el as HTMLScriptElement);
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scanExistingScripts);
    } else {
      scanExistingScripts();
    }

    // ========================================================
    // 2. FETCH PATCH — intercept X's API responses
    // ========================================================
    window.fetch = async function (...args: Parameters<typeof fetch>) {
      const response = await originalFetch.apply(this, args);

      try {
        const url =
          typeof args[0] === 'string'
            ? args[0]
            : (args[0] as Request)?.url ?? '';

        if (url.includes('/i/api/')) {
          // Capture GraphQL operation hashes + features from URLs
          const gqlMatch = url.match(/\/graphql\/([^/]+)\/(\w+)/);
          if (gqlMatch) {
            const [, hash, opName] = gqlMatch;
            try {
              const urlObj = new URL(url, 'https://x.com');
              const features = urlObj.searchParams.get('features') ?? '';
              graphqlInfo.set(opName, { hash, features });
              if (features && !fallbackFeatures) {
                fallbackFeatures = features;
              }
            } catch {}
          }

          // Cache tweet data from responses
          const clone = response.clone();
          clone
            .json()
            .then((data) => extractAndCacheTweets(data))
            .catch(() => {});
        }
      } catch {}

      return response;
    };

    // ========================================================
    // 3. TWEET DATA EXTRACTION from intercepted responses
    // ========================================================
    function extractAndCacheTweets(obj: unknown, depth = 0): void {
      if (depth > 40 || !obj || typeof obj !== 'object') return;

      const r = obj as Record<string, any>;

      if (
        r.legacy &&
        typeof r.legacy === 'object' &&
        typeof r.legacy.id_str === 'string' &&
        typeof r.legacy.full_text === 'string'
      ) {
        cacheTweetFromResult(r);
      }

      // Recurse
      if (Array.isArray(obj)) {
        for (const item of obj) extractAndCacheTweets(item, depth + 1);
      } else {
        for (const value of Object.values(r))
          extractAndCacheTweets(value, depth + 1);
      }
    }

    function cacheTweetFromResult(r: Record<string, any>): void {
      const id: string = r.legacy.id_str;
      let text: string = r.legacy.full_text;
      let urlEntities: Array<Record<string, string>> =
        r.legacy.entities?.urls ?? [];

      // Prefer note_tweet for long-form tweets
      const noteTweet = r.note_tweet?.note_tweet_results?.result;
      if (noteTweet && typeof noteTweet.text === 'string') {
        text = noteTweet.text;
        urlEntities = noteTweet.entity_set?.urls ?? urlEntities;
      }

      text = resolveUrls(text, urlEntities, r.legacy.entities?.media ?? []);

      if (tweetTextCache.size >= MAX_CACHE_SIZE) {
        const firstKey = tweetTextCache.keys().next().value;
        if (firstKey) tweetTextCache.delete(firstKey);
      }
      tweetTextCache.set(id, text);
    }

    function resolveUrls(
      text: string,
      urlEntities: Array<Record<string, string>>,
      mediaEntities: Array<Record<string, string>>,
    ): string {
      for (const u of urlEntities) {
        if (u.url) {
          text = text.replace(
            u.url,
            u.expanded_url ?? u.display_url ?? u.url,
          );
        }
      }
      for (const m of mediaEntities) {
        if (m.url) {
          text = text.replace(m.url, '').trim();
        }
      }
      return text;
    }

    // ========================================================
    // 4. ACTIVE GRAPHQL FETCH (fallback for cache miss)
    // ========================================================
    function getCsrfToken(): string | null {
      return (
        document.cookie
          .split(';')
          .find((c) => c.trim().startsWith('ct0='))
          ?.trim()
          .substring(4) ?? null
      );
    }

    function getGraphQLHash(): string | null {
      // Priority: captured from live requests > pre-scanned from JS bundles
      for (const opName of [
        'TweetResultByRestId',
        'TweetDetail',
        'TimelineTweetDetail',
      ]) {
        const info = graphqlInfo.get(opName);
        if (info) return info.hash;
      }
      return preScannedHash;
    }

    function getFeatures(): string {
      // Priority: captured from live requests > pre-scanned > hardcoded default
      for (const opName of [
        'TweetResultByRestId',
        'TweetDetail',
        'HomeTimeline',
      ]) {
        const info = graphqlInfo.get(opName);
        if (info?.features) return info.features;
      }

      if (fallbackFeatures) return fallbackFeatures;

      return JSON.stringify({
        longform_notetweets_consumption_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true,
        creator_subscriptions_tweet_preview_api_enabled: true,
        c9s_tweet_anatomy_moderator_badge_enabled: true,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        rweb_video_timestamps_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        responsive_web_enhance_cards_enabled: false,
        rweb_tipjar_consumption_enabled: true,
        creator_subscriptions_quote_tweet_preview_enabled: false,
        communities_web_enable_tweet_community_results_fetch: true,
        articles_preview_enabled: true,
      });
    }

    async function fetchTweetViaGraphQL(
      tweetId: string,
    ): Promise<string | null> {
      const ct0 = getCsrfToken();
      if (!ct0) return null;

      const hash = getGraphQLHash();
      if (!hash) return null;

      const features = getFeatures();
      const variables = JSON.stringify({
        tweetId,
        withCommunity: false,
        includePromotedContent: false,
        withVoice: false,
      });

      try {
        const resp = await originalFetch(
          `https://x.com/i/api/graphql/${hash}/TweetResultByRestId?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`,
          {
            headers: {
              authorization: BEARER,
              'x-csrf-token': ct0,
              'x-twitter-auth-type': 'OAuth2Session',
              'x-twitter-active-user': 'yes',
              'content-type': 'application/json',
            },
            credentials: 'include',
          },
        );

        if (!resp.ok) return null;

        const data = await resp.json();
        const result =
          data?.data?.tweetResult?.result ?? data?.data?.tweet_result?.result;
        if (!result) return null;

        // Handle TweetWithVisibilityResults wrapper
        const tweet = result.tweet ?? result;

        let text: string | null = null;
        let urlEntities: Array<Record<string, string>> = [];

        const noteTweet = tweet.note_tweet?.note_tweet_results?.result;
        if (noteTweet && typeof noteTweet.text === 'string') {
          text = noteTweet.text;
          urlEntities = noteTweet.entity_set?.urls ?? [];
        } else if (tweet.legacy?.full_text) {
          text = tweet.legacy.full_text;
          urlEntities = tweet.legacy.entities?.urls ?? [];
        }

        if (!text) return null;

        text = resolveUrls(
          text,
          urlEntities,
          tweet.legacy?.entities?.media ?? [],
        );

        tweetTextCache.set(tweetId, text);
        return text;
      } catch {
        return null;
      }
    }

    // ========================================================
    // 5. MESSAGE HANDLER for isolated-world content script
    // ========================================================
    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;

      if (event.data?.type === 'XTO_FETCH_TWEET') {
        const { tweetId, callbackId } = event.data;

        // Strategy 1: Check cache
        let text = tweetTextCache.get(tweetId) ?? null;

        // Strategy 2: Active GraphQL fetch
        if (!text && tweetId) {
          text = await fetchTweetViaGraphQL(tweetId);
        }

        window.postMessage({
          type: 'XTO_TWEET_RESULT',
          callbackId,
          text,
          cacheSize: tweetTextCache.size,
        });
      }

      if (event.data?.type === 'XTO_DEBUG') {
        window.postMessage({
          type: 'XTO_DEBUG_RESULT',
          cacheSize: tweetTextCache.size,
          cachedIds: [...tweetTextCache.keys()].slice(0, 10),
          graphqlOps: [...graphqlInfo.keys()],
          preScannedHash,
          scannedScriptCount: scannedSrcs.size,
        });
      }
    });
  },
});
