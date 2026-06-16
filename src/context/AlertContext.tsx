'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import Alert from '@/components/ui/alert/Alert';

interface AlertContextType {
  showAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'success',
    visible: false,
  });

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setAlert({ message, type, visible: true });
    // Auto hide after 5 seconds
    setTimeout(() => {
      hideAlert();
    }, 5000);
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert.visible && (
        <Alert
          variant={alert.type}
          title={alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
          message={alert.message}
          showLink={false}
          onClose={hideAlert}
          showCloseButton={true}
        />
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
} 