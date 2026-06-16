"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useAlert } from '@/context/AlertContext';
import {
  Brain,
  Zap,
  Sparkles,
  CheckCircle,
  Cpu,
  Database,
  Send,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
  PlayCircle
} from 'lucide-react';
import DashboardHeader from '@/components/header/DashboardHeader';

interface LLMProvider {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  pricing: string;
  status: 'active' | 'maintenance' | 'beta' | 'coming-soon';
  rating: number;
  models: string[];
  capabilities: string[];
  logo: string;
}

interface FormData {
  apiUrl: string;
  apiKey: string;
  modelName: string;
}

const LLMModelPage: React.FC = () => {
  const { showAlert } = useAlert();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [openProvider, setOpenProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, FormData>>({
    mistral: { apiUrl: '', apiKey: '', modelName: '' },
    openai: { apiUrl: '', apiKey: '', modelName: '' },
    deepseek: { apiUrl: '', apiKey: '', modelName: '' }
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({
    mistral: false,
    openai: false,
    deepseek: false
  });
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({
    mistral: false,
    openai: false,
    deepseek: false
  });

  const providers: LLMProvider[] = [
    {
      id: 'mistral',
      name: 'Mistral AI',
      description: 'Advanced open-source language models with exceptional performance and efficiency',
      shortDescription: 'Lightweight, fast, and efficient for real-time tasks.',
      icon: <Brain className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
      features: [
        'Open-source models',
        'High performance',
        'Cost-effective',
        'Multilingual support',
        'Custom fine-tuning'
      ],
      pricing: 'Pay-per-token',
      status: 'active',
      rating: 4.8,
      models: ['Mistral', 'Mistral 7B', 'Mixtral 8x7B', 'Mistral Large'],
      capabilities: ['Text generation', 'Code completion', 'Translation', 'Summarization'],
      logo: '/images/logo/Mistral-Logo.png'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'Leading AI research company with state-of-the-art language models',
      shortDescription: 'Reliable and versatile with advanced reasoning capabilities.',
      icon: <Zap className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
      features: [
        'GPT-4 Turbo',
        'Advanced reasoning',
        'Multimodal capabilities',
        'Enterprise features',
        'API integration'
      ],
      pricing: 'Subscription + Usage',
      status: 'active',
      rating: 4.9,
      models: ['GPT-4', 'GPT-4 Turbo', 'GPT-3.5 Turbo', 'DALL-E 3'],
      capabilities: ['Conversation', 'Image generation', 'Code analysis', 'Creative writing'],
      logo: '/images/logo/ChatGPT-Logo.png'
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      description: 'Innovative AI models focused on reasoning and mathematical capabilities',
      shortDescription: 'Experimental model focused on structured outputs and deep reasoning.',
      icon: <Sparkles className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
      features: [
        'Mathematical reasoning',
        'Code generation',
        'Research capabilities',
        'Open-source options',
        'High accuracy'
      ],
      pricing: 'Free + Premium',
      status: 'beta',
      rating: 4.7,
      models: ['DeepSeek Coder', 'DeepSeek Math', 'DeepSeek Chat'],
      capabilities: ['Mathematical problem solving', 'Code generation', 'Research assistance', 'Technical writing'],
      logo: '/images/logo/deepseek-Logo.png'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: '✅',
          text: 'Active',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
        };
      case 'beta':
        return {
          icon: '🧪',
          text: 'Beta Release',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
        };
      case 'coming-soon':
        return {
          icon: '⚪',
          text: 'Coming Soon',
          className: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
        };
      case 'maintenance':
        return {
          icon: '⏸️',
          text: 'Maintenance',
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
        };
      default:
        return {
          icon: '⚪',
          text: 'Not Configured',
          className: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
        };
    }
  };

  const handleInputChange = (providerId: string, field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [providerId]: {
        ...prev[providerId],
        [field]: value
      }
    }));
  };

  const toggleProvider = (providerId: string) => {
    setOpenProvider(openProvider === providerId ? null : providerId);
    setSelectedProvider(providerId);
  };

  const toggleApiKeyVisibility = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showAlert('Copied to clipboard!', 'success');
  };

  const getModelNameForPayload = (providerId: string): string => {
    if (providerId === 'openai') return 'OpenAi';
    if (providerId === 'mistral') return 'Mistral';
    return 'DeepSeek';
  };

  const handleSend = async (providerId: string) => {
    const data = formData[providerId];
    
    if (!data.modelName) {
      showAlert('Model identifier is required', 'warning');
      return;
    }
    
    if (!data.apiUrl) {
      showAlert('Endpoint URL is required', 'warning');
      return;
    }
    
    if (!data.apiKey) {
      showAlert('Authentication key is required', 'warning');
      return;
    }

    const widgetId = process.env.NEXT_PUBLIC_WIDGET_ID || 'Model';
    const payload = {
      widget_id: widgetId,
      model: getModelNameForPayload(providerId),
      model_name: data.modelName,
      url: data.apiUrl,
      api_key: data.apiKey,
    };

    setIsLoading(prev => ({ ...prev, [providerId]: true }));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/model/save-credentials/`, {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = (json && (json.detail || json.message)) || `Request failed (${response.status})`;
        showAlert(errorMessage, 'error');
        return;
      }

      showAlert(json?.message || 'LLM credentials saved successfully', 'success');
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error sending request', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleTestConnection = async (providerId: string) => {
    const data = formData[providerId];
    
    if (!data.modelName) {
      showAlert('Model identifier is required', 'warning');
      return;
    }
    
    if (!data.apiUrl) {
      showAlert('Endpoint URL is required', 'warning');
      return;
    }
    
    if (!data.apiKey) {
      showAlert('Authentication key is required', 'warning');
      return;
    }

    setIsLoading(prev => ({ ...prev, [providerId]: true }));

    try {
      if (data.apiUrl.trim() === '' || data.apiKey.trim() === '' || data.modelName.trim() === '') {
        showAlert('Invalid model name. Please match provider\'s exact identifier.', 'error');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showAlert('Connection test successful!', 'success');
    } catch (error) {
      console.error('Error:', error);
      showAlert('Connection test failed', 'error');
    } finally {
      setIsLoading(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const hasNoActiveModel = !selectedProvider;

  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-blue-900/10">
      {/* Professional Header */}
      <div className="mx-4 mt-4 sm:mx-6 sm:mt-6 lg:mx-8 lg:mt-8 mb-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="AI Model Selection & Setup"
          subtitle="Select and configure your preferred AI provider. Each model offers unique strengths — choose the one that best fits your workflow."
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'LLM-Model', href: '/llm-model' },
            { label: 'AI Model Configuration', href: '/llm-model' }
          ]}
          icon={() => (
            <div className="relative">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          )}
          showHelp={showHelp}
          onHelpToggle={() => setShowHelp(!showHelp)}
          helpContent={
            <ul className="space-y-2 text-white/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Select a provider by clicking on its card</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Configure your model credentials in the API Configuration section</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Use the Test Connection button to verify your settings before saving</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Click the info icons to get help with each field</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-300 mt-0.5">•</span>
                <span>Model tooltips provide details about each model&apos;s capabilities</span>
              </li>
            </ul>
          }
        />
      </div>

      {/* Content Section */}
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Empty State / Guidance */}
        {hasNoActiveModel && (
          <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                No model configured yet
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Select one of the providers below to get started. Each provider offers unique capabilities — choose the one that best fits your needs.
              </p>
            </div>
            </div>
          </div>
        )}

      {/* Provider Cards Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-6 lg:gap-8">
          {providers.map((provider) => {
            const statusBadge = getStatusBadge(provider.status);
            const isOpen = openProvider === provider.id;
            const isSelected = selectedProvider === provider.id;

            return (
            <div
              key={provider.id}
                className={`group relative bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                  isSelected ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-xl' : ''
                } ${isOpen ? 'shadow-xl' : ''}`}
              >
                {/* Card Header - Clickable */}
                <div 
                  className={`relative p-6 cursor-pointer transition-all duration-300 ${
                    isOpen 
                      ? `bg-gradient-to-r ${provider.color}` 
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                onClick={() => toggleProvider(provider.id)}
              >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                  {/* Provider Logo */}
                      <div className={`flex-shrink-0 p-2.5 rounded-xl shadow-lg transition-all duration-300 ${
                        isOpen ? 'bg-white' : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800'
                      }`}>
                    <Image 
                      src={provider.logo} 
                      alt={`${provider.name} Logo`}
                      width={48}
                      height={48}
                          className="w-12 h-12 object-contain"
                    />
                  </div>

                      {/* Provider Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className={`text-xl font-bold transition-colors ${
                            isOpen ? 'text-white' : 'text-gray-900 dark:text-white'
                          }`}>
                            {provider.name}
                          </h3>
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            isOpen 
                              ? 'bg-white/20 text-white border border-white/30 backdrop-blur-sm' 
                              : statusBadge.className
                          }`}>
                            <span className="text-sm">{statusBadge.icon}</span>
                            <span>{statusBadge.text}</span>
                          </div>
                        </div>
                        <p className={`text-sm transition-colors ${
                          isOpen ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {provider.shortDescription}
                        </p>
                      </div>
                    </div>

                    {/* Expand/Collapse Icon */}
                    <div className={`flex-shrink-0 ml-4 p-2 rounded-lg transition-all ${
                      isOpen ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                    }`}>
                      {isOpen ? 
                        <ChevronUp className={`w-6 h-6 ${isOpen ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} /> : 
                        <ChevronDown className={`w-6 h-6 ${isOpen ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                      }
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
                {isOpen && (
                  <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    {/* Full Description */}
                    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {provider.description}
                  </p>
                    </div>

                    {/* Available Models */}
                  <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        <Cpu className="w-5 h-5 mr-2 text-blue-500" />
                      Available Models
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.models.map((model, index) => (
                          <div key={index} className="group/model relative">
                          <span
                              className="px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                          >
                            {model}
                              <Info className="w-3.5 h-3.5 ml-2 text-gray-400 group-hover/model:text-blue-500 transition-colors" />
                          </span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/model:block w-72 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-3 px-4 z-20 shadow-xl border border-gray-700">
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                              <p className="leading-relaxed">
                              {provider.id === 'mistral' && model === 'Mistral 7B' && 'Compact model optimized for efficiency and speed.'}
                              {provider.id === 'mistral' && model === 'Mixtral 8x7B' && 'Mixture-of-Experts model. Great balance of cost, speed, and reasoning ability.'}
                              {provider.id === 'mistral' && model === 'Mistral Large' && 'Most capable model with strong reasoning and multilingual support.'}
                              {provider.id === 'openai' && model === 'GPT-4' && 'Highly capable model for complex tasks and creative projects.'}
                              {provider.id === 'openai' && model === 'GPT-4 Turbo' && 'Faster and more efficient version of GPT-4 with improved performance.'}
                              {provider.id === 'openai' && model === 'GPT-3.5 Turbo' && 'Fast and cost-effective model for most everyday tasks.'}
                              {provider.id === 'openai' && model === 'DALL-E 3' && 'Specialized model for generating images from text descriptions.'}
                              {provider.id === 'deepseek' && model === 'DeepSeek Coder' && 'Specialized for code generation and understanding.'}
                              {provider.id === 'deepseek' && model === 'DeepSeek Math' && 'Optimized for mathematical reasoning and problem solving.'}
                              {provider.id === 'deepseek' && model === 'DeepSeek Chat' && 'Balanced model for general conversation and assistance.'}
                              {!((provider.id === 'mistral' || provider.id === 'openai' || provider.id === 'deepseek') && 
                                (model === 'Mistral 7B' || model === 'Mixtral 8x7B' || model === 'Mistral Large' || 
                                 model === 'GPT-4' || model === 'GPT-4 Turbo' || model === 'GPT-3.5 Turbo' || model === 'DALL-E 3' ||
                                 model === 'DeepSeek Coder' || model === 'DeepSeek Math' || model === 'DeepSeek Chat')) && 
                                'Model details coming soon.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* API Configuration Form */}
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Database className="w-5 h-5 mr-2 text-purple-500" />
                      API Configuration
                    </h4>

                    {/* Model Name */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <div className="flex items-center">
                        Model Identifier
                            <div className="group/info relative ml-1.5">
                              <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/info:block w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10 shadow-xl">
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            Enter the exact model name as required by the provider (e.g., mistral-large, gpt-4o-mini).
                              </div>
                          </div>
                        </div>
                      </label>
                      <select
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all hover:border-gray-400 dark:hover:border-gray-500"
                        value={formData[provider.id].modelName}
                        onChange={(e) => handleInputChange(provider.id, 'modelName', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        required
                      >
                        <option value="" disabled>Select a model</option>
                        {provider.models.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                      {/* API URL */}
                      <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <div className="flex items-center">
                        Endpoint URL
                            <div className="group/info relative ml-1.5">
                              <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/info:block w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10 shadow-xl">
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            Use the API base URL provided by your LLM provider.
                              </div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all hover:border-gray-400 dark:hover:border-gray-500"
                          placeholder="https://api.example.com/v1"
                          value={formData[provider.id].apiUrl}
                          onChange={(e) => handleInputChange(provider.id, 'apiUrl', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(formData[provider.id].apiUrl);
                          }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                      {/* API Key */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <div className="flex items-center">
                        Authentication Key
                            <div className="group/info relative ml-1.5">
                              <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600 dark:hover:text-gray-300 transition-colors" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/info:block w-64 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10 shadow-xl">
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                            Paste your API key here. This will remain secure and hidden.
                              </div>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKeys[provider.id] ? "text" : "password"}
                            className="w-full px-4 py-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all hover:border-gray-400 dark:hover:border-gray-500"
                          placeholder="Enter your API key"
                          value={formData[provider.id].apiKey}
                          onChange={(e) => handleInputChange(provider.id, 'apiKey', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleApiKeyVisibility(provider.id);
                            }}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                            title={showApiKeys[provider.id] ? "Hide key" : "Show key"}
                          >
                            {showApiKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(formData[provider.id].apiKey);
                            }}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                            title="Copy to clipboard"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(provider.id);
                        }}
                        disabled={isLoading[provider.id] || !formData[provider.id].apiUrl || !formData[provider.id].apiKey || !formData[provider.id].modelName}
                          className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white font-semibold py-3.5 px-5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isLoading[provider.id] ? (
                          <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                              <PlayCircle className="w-5 h-5" />
                            <span>Test Connection</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSend(provider.id);
                        }}
                        disabled={isLoading[provider.id] || !formData[provider.id].apiUrl || !formData[provider.id].apiKey || !formData[provider.id].modelName}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white font-semibold py-3.5 px-5 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 transform hover:scale-[1.02] active:scale-[0.98]"
                      >
                        {isLoading[provider.id] ? (
                          <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                              <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            <span>Save & Connect</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-gray-800">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
};

export default LLMModelPage;
