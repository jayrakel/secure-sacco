import apiClient from '../../../shared/api/api-client';

export type AssetCategory = 'FURNITURE' | 'EQUIPMENT' | 'COMPUTER' | 'VEHICLE' | 'OTHER';
export type AssetStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'DISPOSED' | 'WRITTEN_OFF';

export interface AssetResponse {
  id: string;
  assetName: string;
  category: AssetCategory;
  status: AssetStatus;
  serialNumber: string | null;
  description: string | null;
  purchaseDate: string;
  purchaseCost: number;
  glAccountCode: string;
  journalReference: string | null;
  location: string | null;
  supplier: string | null;
  warrantyExpiry: string | null;
  disposedAt: string | null;
  disposalNotes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAssetRequest {
  assetName: string;
  category: AssetCategory;
  purchaseDate: string;
  purchaseCost: number;
  serialNumber?: string;
  description?: string;
  location?: string;
  supplier?: string;
  warrantyExpiry?: string;
}

export interface UpdateAssetStatusRequest {
  newStatus: AssetStatus;
  disposalNotes?: string;
}

/** Fetch all assets (optionally filtered by status). */
export const getAssets = (status?: AssetStatus): Promise<AssetResponse[]> =>
  apiClient
    .get('/assets', { params: status ? { status } : undefined })
    .then((r) => r.data);

/** Fetch a single asset by ID. */
export const getAsset = (id: string): Promise<AssetResponse> =>
  apiClient.get(`/assets/${id}`).then((r) => r.data);

/** Register a new asset. Posts GL entry automatically. */
export const registerAsset = (data: RegisterAssetRequest): Promise<AssetResponse> =>
  apiClient.post('/assets', data).then((r) => r.data);

/** Change the status of an asset (dispose / maintenance / write off). */
export const updateAssetStatus = (
  id: string,
  data: UpdateAssetStatusRequest
): Promise<AssetResponse> =>
  apiClient.patch(`/assets/${id}/status`, data).then((r) => r.data);
