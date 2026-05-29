import api from '@/services/api';

interface LoginResponse {
  token: string;
  expires_in: number;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

interface UserProfile {
  id: string;
  username: string;
  role: string;
  properties: Array<{
    property_id: string;
    property_name: string;
    permission_level: string;
  }>;
}

export const login = async (username, password): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', { username, password });
  return response.data.data;
};

export const getProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/auth/profile');
  return response.data.data;
};
