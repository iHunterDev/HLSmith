export interface Collection {
  id: number;
  title: string;
  description?: string | null;
  cover?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionData {
  title: string;
  description?: string | null;
  cover?: string | null;
}

export interface CollectionResponse {
  id: number;
  title: string;
  description?: string | null;
  cover?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionListResponse {
  collections: CollectionResponse[];
  total: number;
}
