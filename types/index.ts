export interface TweetData {
  id: string;
  author: {
    name: string;
    handle: string;
    avatarUrl: string | null;
  };
  text: string;
  timestamp: string;
  images: string[];
  video: {
    thumbnailUrl: string | null;
    tweetUrl: string;
  } | null;
  quoteTweet: TweetData | null;
  metrics: {
    replies: string;
    reposts: string;
    likes: string;
  } | null;
  url: string;
}

export interface ExtensionSettings {
  vaultName: string;
  savePath: string;
  exportMethod: 'uri' | 'rest-api' | 'clipboard';
  restApiPort: number;
  restApiKey: string;
  includeMetrics: boolean;
  includeImages: boolean;
  dateFormat: string;
  fileNameTemplate: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  vaultName: '',
  savePath: 'Clippings/Twitter',
  exportMethod: 'uri',
  restApiPort: 27123,
  restApiKey: '',
  includeMetrics: true,
  includeImages: true,
  dateFormat: 'YYYY-MM-DD',
  fileNameTemplate: '{{title}}',
};

export type Message =
  | { type: 'TOGGLE_SELECTION_MODE' }
  | { type: 'SELECTION_MODE_CHANGED'; active: boolean }
  | { type: 'EXPORT_TWEET'; data: TweetData }
  | { type: 'EXPORT_RESULT'; success: boolean; error?: string }
  | { type: 'OPEN_URI'; uri: string }
  | { type: 'COPY_TO_CLIPBOARD'; text: string };
