import { AxiosRequestConfig } from 'axios';

export interface HttpRequestOptions extends AxiosRequestConfig {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

export interface RequestInterceptor {
  onFulfilled?: (config: unknown) => unknown;
  onRejected?: (error: unknown) => unknown;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: unknown) => unknown;
  onRejected?: (error: unknown) => unknown;
}