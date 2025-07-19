import { httpClient, extractApiData } from '../lib/http';
import { ApiResponse, LoginData, RegisterData, AuthResponse } from '../lib/types';

export const authApi = {
  /**
   * 用户登录
   */
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await httpClient.post<ApiResponse<AuthResponse>>('/api/auth/login', data);
    return extractApiData(response);
  },
  
  /**
   * 用户注册
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await httpClient.post<ApiResponse<AuthResponse>>('/api/auth/register', data);
    return extractApiData(response);
  },
  
  /**
   * 获取用户信息
   */
  getProfile: async (): Promise<unknown> => {
    const response = await httpClient.get<ApiResponse<unknown>>('/api/auth/profile');
    return extractApiData(response);
  },

  /**
   * 用户登出（前端处理）
   */
  logout: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};