import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Video } from './types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  setHydrated: () => void;
}

interface VideoStore {
  videos: Video[];
  currentVideo: Video | null;
  loading: boolean;
  error: string | null;
  setVideos: (videos: Video[]) => void;
  addVideo: (video: Video) => void;
  updateVideo: (id: number, updates: Partial<Video>) => void;
  removeVideo: (id: number) => void;
  setCurrentVideo: (video: Video | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      
      login: (token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ token, user, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ token: null, user: null, isAuthenticated: false });
      },
      
      updateUser: (user: User) => {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 检查是否有有效的token和user，更新认证状态
          const hasValidAuth = !!(state.token && state.user);
          state.isAuthenticated = hasValidAuth;
          state.isHydrated = true;
        }
      },
    }
  )
);

export const useVideoStore = create<VideoStore>((set, get) => ({
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  
  setVideos: (videos: Video[]) => set({ videos }),
  
  addVideo: (video: Video) => {
    const { videos } = get();
    set({ videos: [video, ...videos] });
  },
  
  updateVideo: (id: number, updates: Partial<Video>) => {
    const { videos } = get();
    const updatedVideos = videos.map(video => 
      video.id === id ? { ...video, ...updates } : video
    );
    set({ videos: updatedVideos });
  },
  
  removeVideo: (id: number) => {
    const { videos } = get();
    set({ videos: videos.filter(video => video.id !== id) });
  },
  
  setCurrentVideo: (video: Video | null) => set({ currentVideo: video }),
  
  setLoading: (loading: boolean) => set({ loading }),
  
  setError: (error: string | null) => set({ error }),
}));