import { getLanguage, t } from './i18n';

export interface Passport {
  gtin: string;
  modelName: string;
  batchNumber: string;
  cotton: number;
  elastane: number;
  location: string;
  version: number;
  updatedAt: string;
  carbonKgCo2e?: number;
}

export interface ImportReport {
  total: number;
  imported: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: { row: number; errors: { field: string; message: string }[] }[];
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept-Language', getLanguage());
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error(t('networkFailed'), { cause: error });
  }
  if (!response.ok) {
    let message = t('requestFailed', { status: response.status });
    try {
      const problem = (await response.json()) as {
        title?: string;
        detail?: string;
      };
      message = problem.detail ?? problem.title ?? message;
    } catch {
      /* A proxy/network failure may not return JSON. */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const roleQuery = (authorized: boolean) =>
  authorized ? '?rol=yetkili' : '';

export const api = {
  products: (search: string, signal?: AbortSignal) =>
    request<Passport[]>(`/api/products?q=${encodeURIComponent(search)}`, {
      signal,
    }),
  product: (gtin: string, authorized: boolean, signal?: AbortSignal) =>
    request<Passport>(
      `/api/products/${encodeURIComponent(gtin)}${roleQuery(authorized)}`,
      { signal },
    ),
  history: (gtin: string, authorized: boolean, signal?: AbortSignal) =>
    request<Passport[]>(
      `/api/products/${encodeURIComponent(gtin)}/history${roleQuery(authorized)}`,
      { signal },
    ),
  import: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<ImportReport>('/api/import/csv', { method: 'POST', body });
  },
};
