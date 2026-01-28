import { httpClient, extractApiData } from '../lib/http';
import type {
  ApiResponse,
  CollectionItem,
  CreateCollectionItemRequest,
  UpdateCollectionItemRequest,
} from '../lib/types';

export const collectionItemsApi = {
  /**
   * 新增集数
   */
  createCollectionItem: async (data: CreateCollectionItemRequest): Promise<CollectionItem> => {
    const response = await httpClient.post<ApiResponse<{ item: CollectionItem }>>('/api/collection-items', data);
    const payload = extractApiData(response);
    return payload.item;
  },

  /**
   * 更新集数
   */
  updateCollectionItem: async (id: number, data: UpdateCollectionItemRequest): Promise<CollectionItem> => {
    const response = await httpClient.patch<ApiResponse<{ item: CollectionItem }>>(`/api/collection-items/${id}`, data);
    const payload = extractApiData(response);
    return payload.item;
  },

  /**
   * 删除集数
   */
  deleteCollectionItem: async (id: number): Promise<void> => {
    const response = await httpClient.delete<ApiResponse<void>>(`/api/collection-items/${id}`);
    extractApiData(response);
  },
};
