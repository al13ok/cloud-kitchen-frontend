"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuthHeaders } from '@/utils/api';

export interface LeadPipelineStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  isActive: boolean;
  isCompleted: boolean;
  timestamp?: string;
  notes?: string;
  assignedTo?: string;
}

export interface PipelineHistory {
  id: string;
  stageId: string;
  stageName: string;
  timestamp: string;
  notes?: string;
  changedBy: string;
  previousStage?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://py-mobiloitte.converiqo.ai/api/v1';

export const useLeadPipeline = (leadId: string) => {
  const [currentStage, setCurrentStage] = useState<string>('Lead Captured');
  const [stages, setStages] = useState<LeadPipelineStage[]>([]);
  const [pipelineHistory, setPipelineHistory] = useState<PipelineHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default pipeline stages
  const defaultStages: LeadPipelineStage[] = useMemo(() => [
    {
      id: 'Lead Captured',
      name: 'Lead Captured',
      description: 'Lead has been captured and entered into the system',
      icon: null, // Will be set by the component
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      borderColor: 'border-blue-300 dark:border-blue-600',
      isActive: true,
      isCompleted: false
    },
    {
      id: 'Lead Enriched',
      name: 'Lead Enriched',
      description: 'Lead data has been enriched with additional information',
      icon: null,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
      borderColor: 'border-purple-300 dark:border-purple-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Lead Scored',
      name: 'Lead Scored',
      description: 'Lead has been scored based on qualification criteria',
      icon: null,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
      borderColor: 'border-green-300 dark:border-green-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Contacted',
      name: 'Contacted',
      description: 'Initial contact has been made with the lead',
      icon: null,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      borderColor: 'border-orange-300 dark:border-orange-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Qualified',
      name: 'Qualified',
      description: 'Lead has been qualified as a potential customer',
      icon: null,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900',
      borderColor: 'border-indigo-300 dark:border-indigo-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Proposal Sent',
      name: 'Proposal Sent',
      description: 'Proposal has been sent to the lead',
      icon: null,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900',
      borderColor: 'border-cyan-300 dark:border-cyan-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Negotiation',
      name: 'Negotiation',
      description: 'Negotiating terms and conditions',
      icon: null,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      borderColor: 'border-yellow-300 dark:border-yellow-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Closed Won',
      name: 'Closed Won',
      description: 'Deal has been successfully closed',
      icon: null,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
      borderColor: 'border-green-300 dark:border-green-600',
      isActive: false,
      isCompleted: false
    },
    {
      id: 'Closed Lost',
      name: 'Closed Lost',
      description: 'Deal has been lost or closed without success',
      icon: null,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
      borderColor: 'border-red-300 dark:border-red-600',
      isActive: false,
      isCompleted: false
    }
  ], []);

  // Initialize stages with default values
  useEffect(() => {
    if (stages.length === 0) {
      setStages(defaultStages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch current pipeline stage
  const fetchCurrentStage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/leads-integration/${leadId}/pipeline`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Pipeline data from server:', data);

        // Set current stage from server response
        const serverStage = data.current_stage || data.stage || 'Lead Captured';
        setCurrentStage(serverStage);

        // Update stages based on fetched data
        setStages(prevStages =>
          prevStages.map(stage => {
            const isCurrentStage = stage.id === serverStage;
            const historyEntry = (data.history || data.pipeline_history || []).find((h: Record<string, unknown>) => h.stageId === stage.id || h.stage === stage.id);

            return {
              ...stage,
              isActive: isCurrentStage,
              isCompleted: isCurrentStage || (data.history || data.pipeline_history || []).some((h: Record<string, unknown>) =>
                (h.stageId === stage.id || h.stage === stage.id) && h.status === 'completed'
              ),
              timestamp: historyEntry?.timestamp || historyEntry?.created_at,
              notes: historyEntry?.notes,
              assignedTo: historyEntry?.assignedTo || historyEntry?.assigned_to,
            };
          })
        );
      } else {
        // Handle API error response
        console.log('Pipeline API error response:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.log('Pipeline API error details:', errorData);
        } catch {
          console.log('Could not parse error response');
        }

        // If no server data, initialize with default stage
        console.log('No pipeline data found, initializing with Lead Captured');
        setCurrentStage('Lead Captured');
        setStages(defaultStages);
      }
    } catch (err) {
      console.error('Error fetching pipeline stage:', err);
      setError('Failed to fetch pipeline stage');
      // Fallback to default stage
      setCurrentStage('Lead Captured');
      setStages(defaultStages);
    } finally {
      setLoading(false);
    }
  }, [leadId, defaultStages]);

  // Fetch pipeline history
  const fetchPipelineHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/leads-integration/${leadId}/pipeline/history`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPipelineHistory(data.history || []);
      }
    } catch (err) {
      console.error('Error fetching pipeline history:', err);
    }
  }, [leadId]);

  // Change pipeline stage
  const changeStage = async (stageId: string, notes?: string) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      console.log('🔄 Changing pipeline stage:', { leadId, stageId, notes });
      console.log('🔄 Current stage before change:', currentStage);

      const requestBody = {
        lead_id: leadId, // API expects string, not number
        stage: stageId,
        ...(notes && { notes })
      };

      console.log('Pipeline request body:', requestBody);
      console.log('Pipeline API URL:', `${API_BASE}/leads-integration/pipeline`);
      console.log('Pipeline API headers:', getAuthHeaders());

      const response = await fetch(`${API_BASE}/leads-integration/pipeline`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Pipeline API response status:', response.status);
      console.log('Pipeline API response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const result = await response.json();
        console.log('Stage change result:', result);

        // Update current stage immediately
        console.log('✅ Setting current stage to:', stageId);
        setCurrentStage(stageId);

        // Update stages to reflect the change
        setStages(prevStages => {
          const updatedStages = prevStages.map(stage => ({
            ...stage,
            isActive: stage.id === stageId,
            isCompleted: stage.id === stageId || prevStages.findIndex(s => s.id === stageId) > prevStages.findIndex(s => s.id === stage.id)
          }));
          console.log('✅ Updated stages:', updatedStages);
          return updatedStages;
        });

        // Refresh pipeline history
        await fetchPipelineHistory();

        return true;
      } else {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.log('Pipeline API error response:', errorData);

          // Handle different error response formats
          if (errorData && typeof errorData === 'object') {
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (Object.keys(errorData).length > 0) {
              // If errorData has properties but no message, stringify it
              errorMessage = JSON.stringify(errorData);
            } else {
              // Empty object, use default message
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          } else {
            // No error data or not an object, use default message
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }

          // Log error details safely - only log meaningful content
          if (errorData && typeof errorData === 'object' && Object.keys(errorData).length > 0) {
            console.log('Pipeline API error details:', errorData);
          } else {
            console.log('Pipeline API error details: No detailed error information available');
          }
        } catch (parseError) {
          console.log('Failed to parse error response:', parseError);
          // Keep the default error message if parsing fails
        }

        setError(errorMessage);
        console.error('Pipeline API failed:', errorMessage);
        return false;
      }
    } catch (err) {
      console.error('Error changing pipeline stage:', err);
      setError('Failed to change pipeline stage');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Auto-enrichment trigger
  const triggerAutoEnrichment = async () => {
    try {
      const response = await fetch(`${API_BASE}/leads-integration/${leadId}/enrich`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.error('Error triggering auto-enrichment:', err);
    }
    return false;
  };

  // Auto-scoring trigger
  const triggerAutoScoring = async () => {
    try {
      const response = await fetch(`${API_BASE}/leads-integration/${leadId}/score`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        return true;
      }
    } catch (err) {
      console.error('Error triggering auto-scoring:', err);
    }
    return false;
  };

  // Get stages with current status
  const getStagesWithStatus = () => {
    const currentIndex = stages.findIndex(stage => stage.id === currentStage);

    return stages.map((stage, index) => ({
      ...stage,
      isActive: stage.id === currentStage,
      isCompleted: index < currentIndex,
      timestamp: pipelineHistory.find(h => h.stageId === stage.id)?.timestamp
    }));
  };

  useEffect(() => {
    if (leadId) {
      fetchCurrentStage();
      fetchPipelineHistory();
    }
  }, [leadId, fetchCurrentStage, fetchPipelineHistory]); // Functions are memoized with useCallback

  return {
    currentStage,
    stages: getStagesWithStatus(),
    pipelineHistory,
    loading,
    error,
    changeStage,
    triggerAutoEnrichment,
    triggerAutoScoring,
    fetchCurrentStage,
    fetchPipelineHistory
  };
};

// Import required icons (removed unused imports)
// import {
//   Target,
//   TrendingUp,
//   CheckCircle,
//   Phone,
//   User,
//   FileText,
//   Handshake,
//   CheckCircle2,
//   XCircle
// } from 'lucide-react';
