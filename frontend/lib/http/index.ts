import { httpClient } from './client';
import { setupInterceptors } from './interceptors';

export { httpClient } from './client';
export { 
  AppError, 
  ErrorCategory,
  isNetworkError,
  isAuthError,
  isAuthzError,
  isValidationError,
  isBusinessError,
  isSystemError,
  getErrorMessage,
  getUserFriendlyMessage
} from './errors';
export { extractApiData, handleApiError } from './interceptors';
export type { 
  HttpRequestOptions, 
  UploadProgressCallback,
  RequestInterceptor,
  ResponseInterceptor
} from './types';

setupInterceptors();

export default httpClient;