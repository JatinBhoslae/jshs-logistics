import { useMemo } from 'react';

export const useDateTimeFormatter = () => {
  const formatter = useMemo(() => {
    return {
      formatToLocalDateTime: (isoDate?: string) => {
        if (!isoDate) return '';
        const d = new Date(isoDate);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      },
      
      formatToDisplay: (isoDate?: string) => {
        if (!isoDate) return '—';
        try {
          return new Date(isoDate).toLocaleString();
        } catch (error) {
          console.warn('Invalid date provided to formatDate:', isoDate);
          return 'Invalid Date';
        }
      },
      
      formatToTimeAgo: (isoDate?: string) => {
        if (!isoDate) return '—';
        try {
          const date = new Date(isoDate);
          const now = new Date();
          const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
          
          if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
          if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
          if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
          return `${Math.floor(diffInSeconds / 86400)} days ago`;
        } catch (error) {
          console.warn('Invalid date provided to formatToTimeAgo:', isoDate);
          return 'Invalid Date';
        }
      }
    };
  }, []);

  return formatter;
};