export interface CollectionItem {
  id: number;
  collection_id: number;
  video_id: number;
  title: string;
  sort_order: number;
  available_from?: string | null;
  available_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionItemData {
  collection_id: number;
  video_id: number;
  title: string;
  sort_order?: number;
  available_from?: string | null;
  available_until?: string | null;
}

export interface CollectionItemResponse {
  id: number;
  collection_id: number;
  video_id: number;
  title: string;
  sort_order: number;
  available_from?: string | null;
  available_until?: string | null;
  created_at: string;
  updated_at: string;
}
