import { httpClient, extractApiData } from '../lib/http';
import type {
  ApiResponse,
  CollectionListResponse,
  CollectionDetailResponse,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  Collection,
} from '../lib/types';

export const collectionsApi = {
  /**
   * 获取合集列表
   */
  getCollections: async (): Promise<CollectionListResponse> => {
    const response = await httpClient.get<ApiResponse<CollectionListResponse>>('/api/collections');
    return extractApiData(response);
  },

  /**
   * 获取合集详情
   */
  getCollectionDetail: async (id: number): Promise<CollectionDetailResponse> => {
    const response = await httpClient.get<ApiResponse<CollectionDetailResponse>>(`/api/collections/${id}`);
    return extractApiData(response);
  },

  /**
   * 创建合集
   */
  createCollection: async (data: CreateCollectionRequest): Promise<Collection> => {
    const response = await httpClient.post<ApiResponse<{ collection: Collection }>>('/api/collections', data);
    const payload = extractApiData(response);
    return payload.collection;
  },

  /**
   * 更新合集
   */
  updateCollection: async (id: number, data: UpdateCollectionRequest): Promise<Collection> => {
    const response = await httpClient.patch<ApiResponse<{ collection: Collection }>>(`/api/collections/${id}`, data);
    const payload = extractApiData(response);
    return payload.collection;
  },

  /**
   * 删除合集
   */
  deleteCollection: async (id: number): Promise<void> => {
    const response = await httpClient.delete<ApiResponse<void>>(`/api/collections/${id}`);
    extractApiData(response);
  },
};
