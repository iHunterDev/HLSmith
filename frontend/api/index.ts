import { authApi } from './auth';
import { videoApi } from './video';
import { chunkedUploadApi } from './upload';
import { hlsApi } from './hls';
import { queueApi } from './queue';
import { shareApi } from './share';
import { streamApi } from './stream';
import { systemApi } from './system';
import { collectionsApi } from './collections';
import { collectionItemsApi } from './collectionItems';
import { playbackApi } from './playback';
import { watchApi } from './watch';

export { authApi } from './auth';
export { videoApi } from './video';
export { chunkedUploadApi } from './upload';
export { hlsApi } from './hls';
export { queueApi } from './queue';
export { shareApi } from './share';
export { streamApi } from './stream';
export { systemApi } from './system';
export { collectionsApi } from './collections';
export { collectionItemsApi } from './collectionItems';
export { playbackApi } from './playback';
export { watchApi } from './watch';

// 向后兼容的导出
export const api = {
  auth: authApi,
  video: videoApi,
  upload: chunkedUploadApi,
  hls: hlsApi,
  queue: queueApi,
  share: shareApi,
  stream: streamApi,
  system: systemApi,
  collections: collectionsApi,
  collectionItems: collectionItemsApi,
  playback: playbackApi,
  watch: watchApi
};

export default api;
