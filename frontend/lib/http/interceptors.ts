import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';
import { AppError } from './errors';
import { httpClient } from './client';

export function extractApiData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const apiResponse = response.data;
  
  if (!apiResponse.success) {
    throw new AppError(
      apiResponse.message || '请求失败',
      apiResponse.error?.code,
      apiResponse.error?.type,
      apiResponse.error?.details
    );
  }
  
  return apiResponse.data as T;
}

export function handleApiError(error: AxiosError): never {
  if (error.response?.data) {
    const apiResponse = error.response.data as ApiResponse;
    throw new AppError(
      apiResponse.message || '请求失败',
      apiResponse.error?.code,
      apiResponse.error?.type,
      apiResponse.error?.details
    );
  }
  
  if (error.code === 'ECONNABORTED') {
    throw new AppError('请求超时，请重试', 'TIMEOUT_ERROR', 'TIMEOUT_ERROR');
  }
  
  if (!error.response) {
    throw new AppError('网络连接失败', 'NETWORK_ERROR', 'NETWORK_ERROR');
  }
  
  throw new AppError(
    error.message || '未知错误',
    'INTERNAL_SERVER_ERROR',
    'INTERNAL_ERROR'
  );
}

export function setupInterceptors(): void {
  const instance = httpClient.getInstance();

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (error instanceof AppError) {
        return Promise.reject(error);
      }
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(new AppError('登录已过期，请重新登录', 'TOKEN_EXPIRED', 'AUTHENTICATION_ERROR'));
      }
      
      return Promise.reject(handleApiError(error));
    }
  );
}