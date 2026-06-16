'use client';
import Button from "@/components/ui/button/Button";
import React, { useState, useEffect, useMemo } from "react";
import Alert from "@/components/ui/alert/Alert";
import { BACKEND_URL } from '@/utils/api';
import { 
  HelpCircle, 
  Users, 
  UserCheck, 
  Globe, 
  Save, 
  RotateCcw, 
  Edit3, 
  X, 
  Lightbulb, 
  Shield, 
  Copy,
  Download,
  Upload,
  Eye,
  EyeOff,
  Sparkles,
  Brain,
  Settings,
  Target,
  Lock,
  Unlock
} from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';

export default function PrePrompt() {
  const domains = useMemo(() => [
    { 
      key: 'domain_1', 
      label: 'Employee', 
      icon: Users,
      color: 'blue',
      description: 'AI interactions with company employees and internal staff members',
      defaultPrompt: 'You are an AI assistant helping company employees. Be professional, supportive, and focus on work-related assistance. Always maintain confidentiality and follow company policies.',
      features: ['Internal Knowledge', 'HR Support', 'IT Assistance', 'Policy Guidance'],
      useCases: ['Employee onboarding', 'Internal queries', 'Policy clarification', 'Technical support']
    },
    { 
      key: 'domain_2', 
      label: 'Customer', 
      icon: UserCheck,
      color: 'green',
      description: 'AI interactions with external customers and clients',
      defaultPrompt: 'You are a customer service AI assistant. Be helpful, courteous, and focus on resolving customer inquiries and providing excellent service. Always prioritize customer satisfaction.',
      features: ['Product Support', 'Order Management', 'Billing Help', 'General Inquiries'],
      useCases: ['Product questions', 'Order status', 'Billing support', 'General assistance']
    },
    { 
      key: 'domain_3', 
      label: 'Public', 
      icon: Globe,
      color: 'purple',
      description: 'AI interactions with general public and website visitors',
      defaultPrompt: 'You are a general AI assistant. Be informative, friendly, and provide helpful responses to public inquiries about our services. Maintain a professional yet approachable tone.',
      features: ['General Information', 'Service Overview', 'Basic Support', 'Public Relations'],
      useCases: ['Service information', 'Company overview', 'Basic inquiries', 'Public relations']
    },
  ], []);
  const [prompts, setPrompts] = useState<{ [key: string]: string }>({});
  const [editedPrompt, setEditedPrompt] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({});
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");
  const [activeTab, setActiveTab] = useState<string>('domain_1');
  
  // New enhanced state
  const [showPreview, setShowPreview] = useState<{ [key: string]: boolean }>({});
  const [isLocked, setIsLocked] = useState<{ [key: string]: boolean }>({});
  const [showTips, setShowTips] = useState(true);
  const [wordCount, setWordCount] = useState<{ [key: string]: number }>({});
  const [charCount, setCharCount] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    domains.forEach(domain => {
      setIsLoading(prev => ({ ...prev, [domain.key]: true }));
      fetch(`${BACKEND_URL}/domain/${domain.key}/system-prompt`, {
        method: 'GET',
        headers: { 'accept': 'application/json' },
      })
        .then(res => res.json())
        .then(data => {
          setPrompts(prev => ({ ...prev, [domain.key]: data.system_prompt }));
          setEditedPrompt(prev => ({ ...prev, [domain.key]: data.system_prompt }));
        })
        .catch(() => {
          setPrompts(prev => ({ ...prev, [domain.key]: 'Error loading system prompt' }));
          setEditedPrompt(prev => ({ ...prev, [domain.key]: 'Error loading system prompt' }));
        })
        .finally(() => {
          setIsLoading(prev => ({ ...prev, [domain.key]: false }));
        });
    });
  }, [domains]);

  const handleRestoreDefault = async (domainKey: string) => {
    const domain = domains.find(d => d.key === domainKey);
    if (domain?.defaultPrompt) {
      setEditedPrompt(prev => ({ ...prev, [domainKey]: domain.defaultPrompt }));
    }
  };

  const handleEdit = (domainKey: string) => {
    setIsEditing(prev => ({ ...prev, [domainKey]: true }));
  };

  const handleCancel = (domainKey: string) => {
    setEditedPrompt(prev => ({ ...prev, [domainKey]: prompts[domainKey] }));
    setIsEditing(prev => ({ ...prev, [domainKey]: false }));
  };

  const handleSave = async (domainKey: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/domain/${domainKey}/system-prompt`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: editedPrompt[domainKey] }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      setPrompts(prev => ({ ...prev, [domainKey]: editedPrompt[domainKey] }));
      setIsEditing(prev => ({ ...prev, [domainKey]: false }));
      setAlertMessage(data.message);
      setAlertType('success');
      setTimeout(() => setAlertMessage(''), 3000);
    } catch {
      setAlertMessage('Error saving system prompt');
      setAlertType('error');
      setTimeout(() => setAlertMessage(''), 3000);
    }
  };

  // New enhanced functions
  const handleCopyPrompt = (domainKey: string) => {
    navigator.clipboard.writeText(editedPrompt[domainKey] || prompts[domainKey] || '');
    setAlertMessage('Prompt copied to clipboard');
    setAlertType('success');
    setTimeout(() => setAlertMessage(''), 2000);
  };

  const handleDownloadPrompt = (domainKey: string) => {
    const domain = domains.find(d => d.key === domainKey);
    const content = editedPrompt[domainKey] || prompts[domainKey] || '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain?.label || 'prompt'}_system_prompt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadPrompt = (domainKey: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setEditedPrompt(prev => ({ ...prev, [domainKey]: content }));
      };
      reader.readAsText(file);
    }
  };

  const handleTogglePreview = (domainKey: string) => {
    setShowPreview(prev => ({ ...prev, [domainKey]: !prev[domainKey] }));
  };

  const handleToggleLock = (domainKey: string) => {
    setIsLocked(prev => ({ ...prev, [domainKey]: !prev[domainKey] }));
  };

  const updateWordCount = (domainKey: string, text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const chars = text.length;
    setWordCount(prev => ({ ...prev, [domainKey]: words }));
    setCharCount(prev => ({ ...prev, [domainKey]: chars }));
  };


  const getDomainColor = (color: string) => {
    switch (color) {
      case 'blue': return 'from-blue-500 to-blue-600';
      case 'green': return 'from-green-500 to-green-600';
      case 'purple': return 'from-purple-500 to-purple-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Professional Header */}
      <div className="mx-2 sm:mx-4 mt-2 sm:mt-4 mb-4 sm:mb-8">
        <DashboardHeader
          variant="default"
          size="md"
          title="Pre-Prompts & Role Customization"
          subtitle="Define how the AI agent interacts with different user types. Configure system prompts, security levels, and behavioral patterns for optimal user experience."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'AI Prompt Management', href: '/pre-prompt' }
          ]}
          icon={() => (
            <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          )}
          actions={
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-white/80 font-normal">
                  AI Behavior Control
                </span>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 border border-white/20">
                  <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80" />
                  <span className="text-white/90 text-xs font-medium">3 Domains</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 border border-white/20">
                  <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80" />
                  <span className="text-white/90 text-xs font-medium">Advanced</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 border border-white/20">
                  <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80" />
                  <span className="text-white/90 text-xs font-medium">Role AI</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 border border-white/20">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/80" />
                  <span className="text-white/90 text-xs font-medium">Templates</span>
                </div>
              </div>
            </div>
          }
        />
      </div>

      {/* Alert Messages */}
      {alertMessage && (
        <div className="mx-2 sm:mx-4 mb-3 sm:mb-6">
          <Alert
            variant={alertType}
            title={alertType === "success" ? "Success" : "Error"}
            message={alertMessage}
            showLink={false}
          />
        </div>
      )}
      
      {/* Enhanced Tabs Navigation */}
      <div className="mx-2 sm:mx-4 mb-4 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-1">
                AI Domains
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Select a domain to configure AI behavior and system prompts
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowTips(!showTips)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  showTips 
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                }`}
                title="Toggle Tips"
              >
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {domains.map((domain) => {
              const IconComponent = domain.icon;
              const isActive = activeTab === domain.key;
              
              return (
              <button
                key={domain.key}
                onClick={() => setActiveTab(domain.key)}
                  className={`relative p-3 sm:p-6 rounded-lg sm:rounded-xl border-2 transition-all duration-300 text-left group ${
                    isActive
                      ? `border-${domain.color}-500 bg-${domain.color}-50 dark:bg-${domain.color}-900/20 shadow-lg transform scale-105`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-4">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r ${getDomainColor(domain.color)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <IconComponent className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {domain.label} Domain
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">
                        {domain.description}
                      </p>
                      <div className="flex items-center gap-2">
                        {isLocked[domain.key] && (
                          <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
              </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Enhanced Domain Configuration */}
      {domains
        .filter(domain => domain.key === activeTab)
        .map(domain => {
          const IconComponent = domain.icon;
          const currentPrompt = editedPrompt[domain.key] || prompts[domain.key] || '';
          
          return (
            <div key={domain.key} className="mx-2 sm:mx-4 mb-4 sm:mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                {/* Enhanced Card Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-3 sm:px-6 py-3 sm:py-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-2 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-r ${getDomainColor(domain.color)} flex items-center justify-center shadow-lg flex-shrink-0`}>
                        <IconComponent className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                      </div>
                <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
                          {domain.label} Domain Configuration
                  </h2>
                        <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                    {domain.description}
                  </p>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {domain.features.map((feature, index) => (
                            <span key={index} className="px-2 sm:px-3 py-1 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs sm:text-sm rounded-full border border-gray-200 dark:border-gray-500">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:gap-3">
                  {isEditing[domain.key] ? (
                    <>
                      <Button 
                            size="sm" 
                        variant="outline" 
                        onClick={() => handleCancel(domain.key)}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 text-xs sm:text-sm"
                      >
                            <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Cancel</span>
                      </Button>
                      <Button 
                            size="sm" 
                        variant="outline" 
                        onClick={() => handleRestoreDefault(domain.key)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-600 dark:hover:bg-orange-900/20 text-xs sm:text-sm"
                      >
                            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Restore Default</span>
                      </Button>
                      <Button
                            size="sm"
                        variant="primary"
                        onClick={() => handleSave(domain.key)}
                        disabled={editedPrompt[domain.key] === prompts[domain.key]}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm"
                      >
                            <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Save Changes</span>
                            <span className="sm:hidden">Save</span>
                      </Button>
                    </>
                  ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleCopyPrompt(domain.key)}
                            className="text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 text-xs sm:text-sm"
                          >
                            <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Copy</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDownloadPrompt(domain.key)}
                            className="text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 text-xs sm:text-sm"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Download</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleToggleLock(domain.key)}
                            className={`text-xs sm:text-sm ${isLocked[domain.key] ? "text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20" : "text-gray-600 border-gray-300 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"}`}
                          >
                            {isLocked[domain.key] ? <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> : <Unlock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />}
                            <span className="hidden sm:inline">{isLocked[domain.key] ? 'Unlock' : 'Lock'}</span>
                          </Button>
                    <Button 
                            size="sm" 
                      variant="primary" 
                      onClick={() => handleEdit(domain.key)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm"
                            disabled={isLocked[domain.key]}
                    >
                            <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Edit Prompt</span>
                            <span className="sm:hidden">Edit</span>
                    </Button>
                        </>
                  )}
                </div>
              </div>
            </div>

                {/* Enhanced Card Content */}
                <div className="p-3 sm:p-6">
                  <div className="space-y-4 sm:space-y-6">
                    {/* System Prompt Section */}
                <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <label className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                      System Prompt
                    </label>
                    <div className="group relative">
                            <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" />
                            <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-72 sm:w-80 lg:w-96 p-3 sm:p-4 bg-gray-900 dark:bg-gray-800 text-white text-xs sm:text-sm rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                              <div className="font-semibold mb-2">💡 Editing Guidelines:</div>
                              <ul className="space-y-1 text-xs">
                                <li>• Be specific about the AI&apos;s role and behavior</li>
                          <li>• Include security and boundary rules</li>
                          <li>• Use clear, unambiguous language</li>
                          <li>• Test changes in a safe environment first</li>
                          <li>• Consider the impact on user experience</li>
                                <li>• Keep prompts concise but comprehensive</li>
                        </ul>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePreview(domain.key)}
                            className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {showPreview[domain.key] ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                            <span className="hidden sm:inline">{showPreview[domain.key] ? 'Hide Preview' : 'Show Preview'}</span>
                            <span className="sm:hidden">{showPreview[domain.key] ? 'Hide' : 'Show'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Word/Character Count */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                          <span>Words: {wordCount[domain.key] || 0}</span>
                          <span>Characters: {charCount[domain.key] || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                        </div>
                      </div>

                  {isLoading[domain.key] ? (
                        <div className="h-60 sm:h-80 bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-purple-600"></div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Loading system prompt...</span>
                          </div>
                    </div>
                  ) : isEditing[domain.key] ? (
                        <div className="space-y-3 sm:space-y-4">
                    <textarea
                      value={editedPrompt[domain.key] || ''}
                            onChange={(e) => {
                              setEditedPrompt(prev => ({ ...prev, [domain.key]: e.target.value }));
                              updateWordCount(domain.key, e.target.value);
                            }}
                            className="w-full h-60 sm:h-80 p-3 sm:p-4 font-mono text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                      placeholder="Enter system prompt for this domain..."
                            disabled={isLocked[domain.key]}
                          />
                          
                          {/* Upload File Input */}
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept=".txt,.md"
                              onChange={(e) => handleUploadPrompt(domain.key, e)}
                              className="hidden"
                              id={`upload-${domain.key}`}
                            />
                            <label
                              htmlFor={`upload-${domain.key}`}
                              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="hidden sm:inline">Upload from File</span>
                              <span className="sm:hidden">Upload</span>
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          <div className="h-60 sm:h-80 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl overflow-y-auto">
                            <pre className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                              {currentPrompt || 'No prompt configured'}
                      </pre>
                          </div>
                          
                          {/* Preview Mode */}
                          {showPreview[domain.key] && (
                            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl">
                              <h4 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1 sm:mb-2">Preview Mode</h4>
                              <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                                This is how the AI will interpret and use this prompt in conversations.
                              </div>
                            </div>
                          )}
                    </div>
                  )}
                    </div>

                    {/* Use Cases Section */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">Common Use Cases</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                        {domain.useCases.map((useCase, index) => (
                          <div key={index} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
                            {useCase}
                          </div>
                        ))}
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
          );
        })}
    </div>
  );
}
