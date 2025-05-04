import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function useEcheances(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams(filters);
        const response = await apiClient.get(`/echeances?${params}`);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { data, loading, error };
}