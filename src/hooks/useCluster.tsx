import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { Cluster } from '../lib/api';

interface ClusterContextType {
  clusters: Cluster[];
  selected: Cluster | null;
  selectCluster: (id: string) => void;
  loading: boolean;
  refresh: () => void;
}

const ClusterContext = createContext<ClusterContextType>({
  clusters: [],
  selected: null,
  selectCluster: () => {},
  loading: true,
  refresh: () => {},
});

export function ClusterProvider({ children }: { children: ReactNode }) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem('infradar-cluster')
  );
  const [loading, setLoading] = useState(true);

  const fetchClusters = useCallback(() => {
    api.getClusters()
      .then((list) => {
        setClusters(list);
        // Auto-select first cluster if none selected or selected not found
        if (list.length > 0) {
          const saved = localStorage.getItem('infradar-cluster');
          if (!saved || !list.find(c => c.id === saved)) {
            setSelectedId(list[0].id);
            localStorage.setItem('infradar-cluster', list[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  const selectCluster = useCallback((id: string) => {
    setSelectedId(id);
    localStorage.setItem('infradar-cluster', id);
  }, []);

  const selected = clusters.find(c => c.id === selectedId) || null;

  return (
    <ClusterContext.Provider value={{ clusters, selected, selectCluster, loading, refresh: fetchClusters }}>
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  return useContext(ClusterContext);
}
