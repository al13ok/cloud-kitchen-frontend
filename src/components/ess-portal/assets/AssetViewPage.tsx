"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, ArrowLeft, User, Clock, FileText, Download, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { ESS_PORTAL_ENDPOINTS, essApiFetch } from '@/utils/essApi';
import DashboardHeader from '@/components/header/DashboardHeader';

interface AssetRequestDetails {
  id: string;
  requestId: string;
  employeeInfo: {
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    email: string;
  };
  assetDetails: {
    assetType: 'Hardware' | 'Software' | 'Other';
    assetName: string;
    quantity: number;
    justification: string;
    priority: string;
    expectedDate: string | null;
  };
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  requestedDate: string;
  expectedDate: string;
  createdAt: string;
  updatedAt: string;
}

const AssetViewPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('id');

  const [assetRequest, setAssetRequest] = useState<AssetRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAssetRequest = async () => {
      if (!requestId) {
        setError('No request ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`🔍 Fetching asset request with ID: ${requestId}`);
        
        // First, try to fetch from the individual endpoint
        let response: Response;
        try {
          response = await essApiFetch(ESS_PORTAL_ENDPOINTS.ASSETS.GET(requestId), {
            method: 'GET'
          });
        } catch (fetchError) {
          console.warn(`⚠️ Direct fetch failed, trying list endpoint as fallback:`, fetchError);
          response = null as unknown as Response;
        }

        // If direct fetch failed with 403 or 404, try fetching from list and filtering
        if (!response || !response.ok) {
          const status = response?.status || 0;
          console.log(`⚠️ Direct endpoint returned ${status}, trying list endpoint as fallback...`);
          
          // Fallback: Fetch from list endpoint and filter by ID
          try {
            const listResponse = await essApiFetch(ESS_PORTAL_ENDPOINTS.ASSETS.LIST(), {
              method: 'GET'
            });

            if (listResponse.ok) {
              const listResult = await listResponse.json();
              console.log(`✅ List endpoint response:`, listResult);
              
              // Find the asset request in the list by ID
              const assets = listResult.data || listResult || [];
              const foundAsset = Array.isArray(assets) 
                ? assets.find((asset: { id?: string; requestId?: string }) => asset.id === requestId || asset.requestId === requestId)
                : null;

              if (foundAsset && mounted) {
                console.log(`✅ Found asset request in list:`, foundAsset);
                // Map backend data to component format
                const mappedData = {
                  id: foundAsset.id || requestId || '',
                  requestId: foundAsset.requestId || foundAsset.id || requestId || '',
                  employeeInfo: foundAsset.employeeInfo || {
                    employeeCode: foundAsset.employeeCode || '',
                    fullName: foundAsset.employeeName || foundAsset.fullName || '',
                    department: foundAsset.department || '',
                    designation: foundAsset.designation || '',
                    email: foundAsset.email || ''
                  },
                  assetDetails: foundAsset.assetDetails || {
                    assetType: foundAsset.assetType || 'Hardware',
                    assetName: foundAsset.assetName || '',
                    quantity: foundAsset.quantity || 1,
                    justification: foundAsset.justification || foundAsset.description || '',
                    priority: foundAsset.priority || 'Medium',
                    expectedDate: foundAsset.expectedDate || foundAsset.assetDetails?.expectedDate || null
                  },
                  status: foundAsset.status || 'Pending',
                  requestedDate: foundAsset.requestedDate || foundAsset.createdAt || foundAsset.created_at || '',
                  expectedDate: foundAsset.expectedDate || foundAsset.assetDetails?.expectedDate || '',
                  createdAt: foundAsset.createdAt || foundAsset.created_at || '',
                  updatedAt: foundAsset.updatedAt || foundAsset.updated_at || ''
                };
                setAssetRequest(mappedData);
                setLoading(false);
                return;
              } else {
                console.warn(`⚠️ Asset request not found in list`);
              }
            }
          } catch (listError) {
            console.error(`❌ List endpoint also failed:`, listError);
          }

          // If both methods failed, show error
          let errorMessage = `HTTP ${status}: ${response?.statusText || 'Unknown error'}`;
          if (response) {
            try {
              const errorData = await response.json();
              errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
              errorMessage = response.statusText || errorMessage;
            }
          }

          if (mounted) {
            setError(errorMessage || 'Asset request not found');
            setLoading(false);
          }
          return;
        }

        // Successfully fetched from direct endpoint
        const result = await response.json();
        console.log(`✅ API Response:`, result);
        
        // Handle different response structures
        let assetData = null;
        if (result.success && result.data) {
          assetData = result.data;
        } else if (result.data) {
          assetData = result.data;
        } else if (result.id || result.requestId || result.employeeInfo) {
          // Direct data object (the asset request itself)
          assetData = result;
        }

        if (assetData && mounted) {
          // Map backend data to component format if needed
          const mappedData = {
            id: assetData.id || requestId || '',
            requestId: assetData.requestId || assetData.id || requestId || '',
            employeeInfo: assetData.employeeInfo || {
              employeeCode: assetData.employeeCode || '',
              fullName: assetData.employeeName || assetData.fullName || '',
              department: assetData.department || '',
              designation: assetData.designation || '',
              email: assetData.email || ''
            },
            assetDetails: assetData.assetDetails || {
              assetType: assetData.assetType || 'Hardware',
              assetName: assetData.assetName || '',
              quantity: assetData.quantity || 1,
              justification: assetData.justification || assetData.description || '',
              priority: assetData.priority || 'Medium',
              expectedDate: assetData.expectedDate || assetData.assetDetails?.expectedDate || null
            },
            status: assetData.status || 'Pending',
            requestedDate: assetData.requestedDate || assetData.createdAt || assetData.created_at || '',
            expectedDate: assetData.expectedDate || assetData.assetDetails?.expectedDate || '',
            createdAt: assetData.createdAt || assetData.created_at || '',
            updatedAt: assetData.updatedAt || assetData.updated_at || ''
          };
          setAssetRequest(mappedData);
        } else {
          throw new Error(result.message || 'Failed to fetch asset request details');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`❌ Error fetching asset request:`, error);
        
        // Last resort: Try fetching from list
        if (mounted) {
          try {
            console.log(`🔄 Attempting fallback to list endpoint...`);
            const listResponse = await essApiFetch(ESS_PORTAL_ENDPOINTS.ASSETS.LIST(), {
              method: 'GET'
            });

            if (listResponse.ok) {
              const listResult = await listResponse.json();
              const assets = listResult.data || listResult || [];
              const foundAsset = Array.isArray(assets) 
                ? assets.find((asset: { id?: string; requestId?: string }) => asset.id === requestId || asset.requestId === requestId)
                : null;

              if (foundAsset && mounted) {
                console.log(`✅ Found asset request via fallback:`, foundAsset);
                // Map backend data to component format
                const mappedData = {
                  id: foundAsset.id || requestId || '',
                  requestId: foundAsset.requestId || foundAsset.id || requestId || '',
                  employeeInfo: foundAsset.employeeInfo || {
                    employeeCode: foundAsset.employeeCode || '',
                    fullName: foundAsset.employeeName || foundAsset.fullName || '',
                    department: foundAsset.department || '',
                    designation: foundAsset.designation || '',
                    email: foundAsset.email || ''
                  },
                  assetDetails: foundAsset.assetDetails || {
                    assetType: foundAsset.assetType || 'Hardware',
                    assetName: foundAsset.assetName || '',
                    quantity: foundAsset.quantity || 1,
                    justification: foundAsset.justification || foundAsset.description || '',
                    priority: foundAsset.priority || 'Medium',
                    expectedDate: foundAsset.expectedDate || foundAsset.assetDetails?.expectedDate || null
                  },
                  status: foundAsset.status || 'Pending',
                  requestedDate: foundAsset.requestedDate || foundAsset.createdAt || foundAsset.created_at || '',
                  expectedDate: foundAsset.expectedDate || foundAsset.assetDetails?.expectedDate || '',
                  createdAt: foundAsset.createdAt || foundAsset.created_at || '',
                  updatedAt: foundAsset.updatedAt || foundAsset.updated_at || ''
                };
                setAssetRequest(mappedData);
                setLoading(false);
                return;
              }
            }
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed:`, fallbackError);
          }
          
          setError(errorMsg);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAssetRequest();

    // Poll for status updates every 5 seconds to reflect manager approval changes
    const interval = setInterval(async () => {
      if (!mounted || !requestId) return;
      
      try {
        // Try direct endpoint first
        let response: Response;
        try {
          response = await essApiFetch(ESS_PORTAL_ENDPOINTS.ASSETS.GET(requestId), {
            method: 'GET'
          });
        } catch {
          // If direct fails, try list endpoint
          const listResponse = await essApiFetch(ESS_PORTAL_ENDPOINTS.ASSETS.LIST(), {
            method: 'GET'
          });
          
          if (listResponse.ok) {
            const listResult = await listResponse.json();
            const assets = listResult.data || listResult || [];
            const foundAsset = Array.isArray(assets) 
              ? assets.find((asset: { id?: string; requestId?: string }) => asset.id === requestId || asset.requestId === requestId)
              : null;
            
            if (foundAsset && mounted) {
              // Map backend data to component format
              const mappedData = {
                id: foundAsset.id || requestId || '',
                requestId: foundAsset.requestId || foundAsset.id || requestId || '',
                employeeInfo: foundAsset.employeeInfo || {
                  employeeCode: foundAsset.employeeCode || '',
                  fullName: foundAsset.employeeName || foundAsset.fullName || '',
                  department: foundAsset.department || '',
                  designation: foundAsset.designation || '',
                  email: foundAsset.email || ''
                },
                assetDetails: foundAsset.assetDetails || {
                  assetType: foundAsset.assetType || 'Hardware',
                  assetName: foundAsset.assetName || '',
                  quantity: foundAsset.quantity || 1,
                  justification: foundAsset.justification || foundAsset.description || '',
                  priority: foundAsset.priority || 'Medium',
                  expectedDate: foundAsset.expectedDate || foundAsset.assetDetails?.expectedDate || null
                },
                status: foundAsset.status || 'Pending',
                requestedDate: foundAsset.requestedDate || foundAsset.createdAt || foundAsset.created_at || '',
                expectedDate: foundAsset.expectedDate || foundAsset.assetDetails?.expectedDate || '',
                createdAt: foundAsset.createdAt || foundAsset.created_at || '',
                updatedAt: foundAsset.updatedAt || foundAsset.updated_at || ''
              };
              setAssetRequest(prevRequest => {
                if (!prevRequest || prevRequest.status !== mappedData.status) {
                  return mappedData;
                }
                return prevRequest;
              });
            }
          }
          return;
        }

        if (!response.ok) return;

        const result = await response.json();
        
        const assetData = result.success ? result.data : (result.data || result);
        if (assetData && mounted) {
          // Map backend data to component format
          const mappedData = {
            id: assetData.id || requestId || '',
            requestId: assetData.requestId || assetData.id || requestId || '',
            employeeInfo: assetData.employeeInfo || {
              employeeCode: assetData.employeeCode || '',
              fullName: assetData.employeeName || assetData.fullName || '',
              department: assetData.department || '',
              designation: assetData.designation || '',
              email: assetData.email || ''
            },
            assetDetails: assetData.assetDetails || {
              assetType: assetData.assetType || 'Hardware',
              assetName: assetData.assetName || '',
              quantity: assetData.quantity || 1,
              justification: assetData.justification || assetData.description || '',
              priority: assetData.priority || 'Medium',
              expectedDate: assetData.expectedDate || assetData.assetDetails?.expectedDate || null
            },
            status: assetData.status || 'Pending',
            requestedDate: assetData.requestedDate || assetData.createdAt || assetData.created_at || '',
            expectedDate: assetData.expectedDate || assetData.assetDetails?.expectedDate || '',
            createdAt: assetData.createdAt || assetData.created_at || '',
            updatedAt: assetData.updatedAt || assetData.updated_at || ''
          };
          setAssetRequest(prevRequest => {
            // Only update if status has changed
            if (!prevRequest || prevRequest.status !== mappedData.status) {
              return mappedData;
            }
            return prevRequest;
          });
        }
      } catch (error) {
        // Ignore polling errors
        console.warn('Error polling asset request status:', error);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [requestId]);

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Pending
          </span>
        );
      case 'manager_approved':
      case 'manager approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Manager Approved
          </span>
        );
      case 'manager_rejected':
      case 'manager rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Manager Rejected
          </span>
        );
      case 'hr_approved':
      case 'hr approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            HR Approved
          </span>
        );
      case 'hr_rejected':
      case 'hr rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            HR Rejected
          </span>
        );
      case 'it_approved':
      case 'it approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            IT Approved
          </span>
        );
      case 'it_rejected':
      case 'it rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            IT Rejected
          </span>
        );
      case 'finance_approved':
      case 'finance approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Finance Approved
          </span>
        );
      case 'finance_rejected':
      case 'finance rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Finance Rejected
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Rejected
          </span>
        );
      case 'issued':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Issued
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
            {status}
          </span>
        );
    }
  };

  const getTypeBadge = (type: string) => {
    const normalizedType = type.toLowerCase();
    const typeColors = {
      'hardware': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      'software': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      'other': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${typeColors[normalizedType as keyof typeof typeColors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {type}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const normalizedPriority = priority.toLowerCase();
    const priorityColors = {
      'low': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
      'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
      'high': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400',
      'urgent': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${priorityColors[normalizedPriority as keyof typeof priorityColors] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
        {priority}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Download functionality
  const handleDownloadPDF = () => {
    if (!assetRequest) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Asset Request Details', 20, 30);
    
    // Add employee information
    doc.setFontSize(14);
    doc.text('Employee Information:', 20, 50);
    doc.setFontSize(12);
    doc.text(`Employee Code: ${assetRequest.employeeInfo.employeeCode}`, 20, 65);
    doc.text(`Full Name: ${assetRequest.employeeInfo.fullName}`, 20, 75);
    doc.text(`Designation: ${assetRequest.employeeInfo.designation}`, 20, 85);
    doc.text(`Department: ${assetRequest.employeeInfo.department}`, 20, 95);
    
    // Add asset details
    doc.setFontSize(14);
    doc.text('Asset Details:', 20, 115);
    doc.setFontSize(12);
    doc.text(`Asset Type: ${assetRequest.assetDetails.assetType}`, 20, 130);
    doc.text(`Asset Name: ${assetRequest.assetDetails.assetName}`, 20, 140);
    doc.text(`Quantity: ${assetRequest.assetDetails.quantity}`, 20, 150);
    doc.text(`Priority: ${assetRequest.assetDetails.priority}`, 20, 160);
    doc.text(`Requested On: ${formatDate(assetRequest.requestedDate)}`, 20, 170);
    doc.text(`Status: ${assetRequest.status.toUpperCase()}`, 20, 180);
    
    // Add justification
    doc.setFontSize(14);
    doc.text('Justification:', 20, 200);
    doc.setFontSize(12);
    const justificationLines = doc.splitTextToSize(assetRequest.assetDetails.justification, 170);
    doc.text(justificationLines, 20, 215);
    
    // Generate filename with custom format: requestId:date:time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const filename = `${assetRequest.requestId}:${dateStr}:${timeStr}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    setDownloadMenuOpen(false);
  };

  const handleDownloadCSV = () => {
    if (!assetRequest) return;

    const csvData = [
      ['Field', 'Value'],
      ['Request ID', assetRequest.requestId],
      ['Employee Code', assetRequest.employeeInfo.employeeCode],
      ['Full Name', assetRequest.employeeInfo.fullName],
      ['Designation', assetRequest.employeeInfo.designation],
      ['Department', assetRequest.employeeInfo.department],
      ['Asset Type', assetRequest.assetDetails.assetType],
      ['Asset Name', assetRequest.assetDetails.assetName],
      ['Quantity', assetRequest.assetDetails.quantity],
      ['Priority', assetRequest.assetDetails.priority],
      ['Requested On', formatDate(assetRequest.requestedDate)],
      ['Status', assetRequest.status.toUpperCase()],
      ['Justification', assetRequest.assetDetails.justification]
    ];

    // Generate filename with custom format: requestId:date:time
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS format
    const filename = `${assetRequest.requestId}:${dateStr}:${timeStr}.csv`;
    
    const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadMenuOpen(false);
  };

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setDownloadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading asset request details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Asset Request</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/ess-portal/assets')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!assetRequest) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Asset request not found...</p>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/ess-portal/assets');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <DashboardHeader
          title="Asset Request Details"
          subtitle="Comprehensive asset request review with detailed employee information, asset tracking, and request timeline for efficient IT asset management."
          icon={Package}
          iconColor="text-white"
          hideTenantPrefix={true}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'ESS Portal', href: '/ess-portal' },
            { label: 'Assets', href: '/ess-portal/assets' },
            { label: 'View' }
          ]}
          actions={
            <div className="flex items-center gap-3">
              {getStatusBadge(assetRequest.status)}
              <button
                onClick={handleBack}
                className="flex items-center px-6 py-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-200 hover:scale-105 whitespace-nowrap"
                title="Back to Asset Management"
              >
                <ArrowLeft className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">Back</span>
              </button>
            </div>
          }
        />

        {/* Download Button Section */}
        <div className="flex justify-end mb-8 mt-8">
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setDownloadMenuOpen(!downloadMenuOpen)}
              className="inline-flex items-center px-6 py-3 bg-[#3366CC] hover:bg-[#2d5bb3] text-white rounded-xl hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 font-semibold"
              title="Download Asset Request"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Asset Request
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>

            {/* Download Menu */}
            {downloadMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={handleDownloadPDF}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download as PDF
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="block w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-[#3366CC]/10 dark:hover:bg-[#3366CC]/20 transition-colors duration-200 flex items-center border-t border-gray-100 dark:border-gray-700"
                >
                  <svg className="w-4 h-4 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download as CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Three Cards Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Employee Information Card */}
          <div className="bg-white/90 dark:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl mr-4 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
                <User className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Employee Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee Code: </span>
                <span className="text-gray-900 dark:text-white">{assetRequest.employeeInfo.employeeCode}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Full Name: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{assetRequest.employeeInfo.fullName}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Designation: </span>
                <span className="text-gray-900 dark:text-white">{assetRequest.employeeInfo.designation}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Department: </span>
                <span className="text-gray-900 dark:text-white">{assetRequest.employeeInfo.department}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email: </span>
                <span className="text-gray-900 dark:text-white">{assetRequest.employeeInfo.email}</span>
              </div>
            </div>
          </div>

          {/* Asset Details Card */}
          <div className="bg-white/90 dark:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl mr-4 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
                <Package className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Asset Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type: </span>
                {getTypeBadge(assetRequest.assetDetails.assetType)}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority: </span>
                {getPriorityBadge(assetRequest.assetDetails.priority)}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Asset Name: </span>
                <span className="text-gray-900 dark:text-white font-semibold">{assetRequest.assetDetails.assetName}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity: </span>
                <span className="font-semibold text-[#3366CC] dark:text-[#4a7dd9]"># {assetRequest.assetDetails.quantity}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requested On: </span>
                <span className="text-gray-900 dark:text-white">{formatFullDate(assetRequest.requestedDate)}</span>
              </div>
              {assetRequest.expectedDate && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Expected Date: </span>
                  <span className="text-gray-900 dark:text-white">{formatFullDate(assetRequest.expectedDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Asset Tracking Card */}
          <div className="bg-white/90 dark:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl mr-4 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
                <Clock className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Asset Tracking</h2>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status: </span>
                {getStatusBadge(assetRequest.status)}
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Created: </span>
                <span className="text-gray-900 dark:text-white">{formatDate(assetRequest.createdAt)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Updated: </span>
                <span className="text-gray-900 dark:text-white">{formatDate(assetRequest.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row - Reason for Request */}
        <div className="mb-8">
          <div className="bg-white/90 dark:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl mr-4 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
                <FileText className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Reason for Request</h2>
            </div>
            <div className="bg-gray-50/50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
              <p className="text-gray-900 dark:text-gray-100 leading-relaxed">{assetRequest.assetDetails.justification}</p>
            </div>
          </div>
        </div>

        {/* Fourth Row - Request Timeline */}
        <div>
          <div className="bg-white/90 dark:bg-gray-800 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 p-6" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 50%, rgba(14, 165, 233, 0.03) 100%)' }}>
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-xl mr-4 bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
                <Clock className="w-6 h-6 text-[#3366CC] dark:text-[#4a7dd9]" />
              </div>
              <h2 className="text-2xl font-bold text-[#3366CC] dark:text-[#4a7dd9]">Request Timeline</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#3366CC]/10 dark:bg-[#3366CC]/20">
                    <svg className="w-4 h-4 text-[#3366CC] dark:text-[#4a7dd9]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Request Submitted</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(assetRequest.createdAt)} at {new Date(assetRequest.createdAt).toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
              {assetRequest.status.toLowerCase() !== 'pending' && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {(() => {
                      const statusLower = assetRequest.status.toLowerCase();
                      const isApproved = statusLower.includes('approved');
                      const isRejected = statusLower.includes('rejected');
                      const isIssued = statusLower === 'issued';
                      
                      return (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isApproved ? 'bg-green-100 dark:bg-green-900/30' :
                          isRejected ? 'bg-red-100 dark:bg-red-900/30' :
                          isIssued ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <svg className={`w-4 h-4 ${
                            isApproved ? 'text-green-600 dark:text-green-400' :
                            isRejected ? 'text-red-600 dark:text-red-400' :
                            isIssued ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                          }`} fill="currentColor" viewBox="0 0 20 20">
                            {isApproved && (
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            )}
                            {isRejected && (
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            )}
                            {isIssued && (
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            )}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Request {assetRequest.status}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(assetRequest.updatedAt)} at {new Date(assetRequest.updatedAt).toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetViewPage;