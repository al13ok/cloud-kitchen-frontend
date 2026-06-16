"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SourceOption {
  optionid: number;
  list_label: string;
}

interface SourceOptionsContextType {
  sourceOptions: string[];
  interestOptions: string[];
  isLoading: boolean;
  error: string | null;
  refreshOptions: () => Promise<void>;
}

const SourceOptionsContext = createContext<SourceOptionsContextType | undefined>(undefined);

export const useSourceOptions = () => {
  const context = useContext(SourceOptionsContext);
  if (context === undefined) {
    throw new Error('useSourceOptions must be used within a SourceOptionsProvider');
  }
  return context;
};

interface SourceOptionsProviderProps {
  children: ReactNode;
}

export const SourceOptionsProvider: React.FC<SourceOptionsProviderProps> = ({ children }) => {
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);
  const [interestOptions, setInterestOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const fetchOptions = React.useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isFetching) return;
    
    setIsFetching(true);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/leads/options`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SourceOption[] = await response.json();
      
      // Filter and set source options (optionid === 2)
      const sources = Array.from(
        new Set(
          data
            .filter(item => item.optionid === 2)
            .map(item => item.list_label?.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      // Filter and set interest options (optionid === 1)
      const interests = Array.from(
        new Set(
          data
            .filter(item => item.optionid === 1)
            .map(item => item.list_label?.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      setSourceOptions(sources);
      setInterestOptions(interests);
    } catch (err) {
      console.error('Failed to fetch source options:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch options');
      
      // Set fallback options
      setSourceOptions([
        'Website',
        'Social Media',
        'Email Campaign',
        'Referral',
        'Search Engine',
        'Advertisement',
        'Other'
      ]);
      setInterestOptions([
        'General Inquiry',
        'Product Demo',
        'Pricing Information',
        'Technical Support',
        'Partnership',
        'Investment Opportunity'
      ]);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [isFetching]);

  const refreshOptions = React.useCallback(async () => {
    // Only fetch if not already fetching and options are empty
    if (!isFetching && sourceOptions.length === 0) {
      await fetchOptions();
    }
  }, [isFetching, sourceOptions.length, fetchOptions]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const value: SourceOptionsContextType = {
    sourceOptions,
    interestOptions,
    isLoading,
    error,
    refreshOptions,
  };

  return (
    <SourceOptionsContext.Provider value={value}>
      {children}
    </SourceOptionsContext.Provider>
  );
};
