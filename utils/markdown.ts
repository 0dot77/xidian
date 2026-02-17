import type { TweetData, ExtensionSettings } from '@/types';

export function formatTweetAsMarkdown(
  tweet: TweetData,
  settings: ExtensionSettings,
): string {
  const date = new Date(tweet.timestamp);
  const formattedDate = formatDate(date, settings.dateFormat);

  const lines: string[] = [];

  // YAML Frontmatter
  lines.push('---');
  lines.push(`author: "${tweet.author.name}"`);
  lines.push(`handle: "${tweet.author.handle}"`);
  lines.push(`source: "${tweet.url}"`);
  lines.push(`date: ${formattedDate}`);
  lines.push('type: tweet');
  if (settings.includeMetrics && tweet.metrics) {
    lines.push(`likes: ${tweet.metrics.likes}`);
    lines.push(`reposts: ${tweet.metrics.reposts}`);
    lines.push(`replies: ${tweet.metrics.replies}`);
  }
  lines.push('---');
  lines.push('');

  // Header
  lines.push(`# ${tweet.author.name} (${tweet.author.handle})`);
  lines.push('');
  lines.push(`> [!info] [Original Post](${tweet.url}) | ${formattedDate}`);
  lines.push('');

  // Tweet body
  lines.push(tweet.text);
  lines.push('');

  // Images
  if (settings.includeImages && tweet.images.length > 0) {
    tweet.images.forEach((imgUrl, i) => {
      lines.push(`![Image ${i + 1}](${imgUrl})`);
    });
    lines.push('');
  }

  // Video
  if (tweet.video) {
    lines.push('> [!tip] Video');
    if (tweet.video.thumbnailUrl) {
      lines.push(`> ![Video thumbnail](${tweet.video.thumbnailUrl})`);
    }
    lines.push(`> [Watch on X](${tweet.url})`);
    lines.push('');
  }

  // Quote tweet
  if (tweet.quoteTweet) {
    lines.push('> [!quote] Quoted Tweet');
    lines.push(
      `> **${tweet.quoteTweet.author.name}** (${tweet.quoteTweet.author.handle})`,
    );
    lines.push(`> ${tweet.quoteTweet.text}`);
    if (tweet.quoteTweet.url) {
      lines.push(`> [Original](${tweet.quoteTweet.url})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatDate(date: Date, format: string): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const hh = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');

  return format
    .replace('YYYY', yyyy)
    .replace('MM', mm)
    .replace('DD', dd)
    .replace('HH', hh)
    .replace('mm', min);
}

export function generateFileName(
  tweet: TweetData,
  template: string,
): string {
  return template
    .replace('{{title}}', generateTitle(tweet))
    .replace('{{handle}}', tweet.author.handle.replace('@', ''))
    .replace('{{id}}', tweet.id)
    .replace('{{date}}', tweet.timestamp.split('T')[0])
    .replace('{{name}}', tweet.author.name.replace(/[/\\?%*:|"<>]/g, '-'));
}

/**
 * Generate a short, meaningful title from tweet content.
 * Takes the first sentence or line (up to ~50 chars), cleans it for use as a filename.
 */
function generateTitle(tweet: TweetData): string {
  const raw = tweet.text.trim();
  if (!raw) return `${tweet.author.handle.replace('@', '')}-${tweet.id}`;

  // Strip @mentions and URLs from the beginning
  let cleaned = raw
    .replace(/^(@\w+\s*)+/, '')       // leading @mentions
    .replace(/https?:\/\/\S+/g, '')   // URLs
    .replace(/\n+/g, ' ')             // newlines → space
    .trim();

  if (!cleaned) return `${tweet.author.handle.replace('@', '')}-${tweet.id}`;

  // Take the first sentence (split by . ! ? or Korean sentence-enders)
  const sentenceMatch = cleaned.match(/^(.+?)[.!?\u3002]\s/);
  if (sentenceMatch && sentenceMatch[1].length >= 10) {
    cleaned = sentenceMatch[1];
  }

  // Truncate to ~50 chars at a word boundary
  if (cleaned.length > 50) {
    cleaned = cleaned.slice(0, 50).replace(/\s\S*$/, '');
  }

  // Remove characters invalid in filenames
  cleaned = cleaned.replace(/[/\\?%*:|"<>#{}[\]`^]/g, '').trim();

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:\-–—]+$/, '').trim();

  if (!cleaned) return `${tweet.author.handle.replace('@', '')}-${tweet.id}`;

  return cleaned;
}
