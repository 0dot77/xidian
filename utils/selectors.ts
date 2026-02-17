export const SELECTORS = {
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  tweetPhoto: '[data-testid="tweetPhoto"]',
  userName: '[data-testid="User-Name"]',
  videoPlayer: '[data-testid="videoPlayer"]',
  videoThumbnail: '[data-testid="videoPlayer"] img',
  timestamp: 'time[datetime]',
  avatarImage: '[data-testid="Tweet-User-Avatar"] img',
  replyCount: '[data-testid="reply"]',
  retweetCount: '[data-testid="retweet"]',
  likeCount: '[data-testid="like"]',
} as const;
