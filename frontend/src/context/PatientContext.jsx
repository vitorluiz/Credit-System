import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import logger from '../utils/logger';

const PatientContext = createContext();

export function usePatients() {
  return useContext(PatientContext);
}

export function PatientProvider({ children }) {
  const [hasPatients, setHasPatients] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setHasPatients(false);
        return;
      }
      const res = await axios.get('/api/patients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasPatients(Array.isArray(res.data) && res.data.length > 0);
    } catch (err) {
      logger.error('Falha ao verificar pacientes no contexto:', err);
      setHasPatients(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
        refetchPatients();
    } else {
        setLoading(false);
    }
  }, [refetchPatients]);

  const value = {
    hasPatients,
    refetchPatients,
    loading,
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}
