import { useState, useEffect } from 'react';
import { useI18n } from '../i18n';

interface Channel {
  id: string;
  name: string;
  channelNumber: number;
  isOnline: boolean;
  // Add more channel properties from API.md
}

export const useChannels = (propertyId: string | null) => {
  const { t } = useI18n();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId) {
      setChannels([]);
      setLoading(false);
      return;
    }

    const fetchChannels = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with actual API call
        const response = await new Promise<Channel[]>((resolve) => {
          setTimeout(() => {
            // Mock data for demonstration
            const mockChannels: Channel[] = Array.from({ length: 8 }).map((_, i) => ({
              id: `channel-${propertyId}-${i + 1}`,
              name: t('测试摄像头 {{number}}', { number: i + 1 }),
              channelNumber: (i + 1) * 100 + 1, // Example: 101, 201
              isOnline: Math.random() > 0.1, // 90% online
            }));
            resolve(mockChannels);
          }, 500);
        });
        setChannels(response);
      } catch (err) {
        setError('Failed to fetch channels.');
        console.error("Error fetching channels:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();

  }, [propertyId, t]);

  return { channels, loading, error };
};
