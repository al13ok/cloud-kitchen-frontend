'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import DashboardHeader from '@/components/header/DashboardHeader'

const initialConnectors = [
  {
    name: 'WhatsApp',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg',
    description: 'Messaging platform for business communication and customer support.',
    connectUrl: 'https://business.whatsapp.com/',
  },
  {
    name: 'Instagram',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg',
    description: 'Social media platform for visual content sharing and marketing.',
    connectUrl: '/Instagram-Integration',
  },
  {
    name: 'Telegram',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg',
    description: 'Messaging platform for business communication and customer support with bot integration.',
    connectUrl: '/telegram-integration',
  }
]

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState(initialConnectors)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [newConnector, setNewConnector] = useState({
    name: '',
    icon: '',
    description: '',
    connectUrl: '',
  })

  const handleRemove = (name: string) => {
    setConnectors(connectors.filter(c => c.name !== name))
  }

  const handleAddIntegration = () => {
    const { name, icon, description, connectUrl } = newConnector
    if (name && icon && description && connectUrl) {
      setConnectors([...connectors, newConnector])
      setNewConnector({ name: '', icon: '', description: '', connectUrl: '' })
      setShowAddForm(false)
    } else {
      alert('Please fill in all fields for the new integration.')
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Professional Header */}
      <div className="mx-6 mt-6 mb-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Integration Center"
          subtitle="Connect and integrate with external services to streamline your workflow"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Integration Center', href: '/integration-center-connectors' }
          ]}
          icon={() => (
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
          showHelp={showHelp}
          onHelpToggle={() => setShowHelp(!showHelp)}
          helpContent={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Connect to popular services like Mailchimp, Google Drive, and Asana</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Secure OAuth authentication for all integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Real-time data synchronization and updates</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Add custom integrations with your own API endpoints</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-pink-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Monitor connection status and health metrics</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Automated error handling and retry mechanisms</span>
                </li>
              </ul>
            </div>
          }
          actions={
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-3 hover:bg-white/20 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-white font-semibold">Add Integration</span>
              </div>
            </button>
          }
        />
      </div>

      {/* Spacing between header and content */}
      <div className="mt-8 mb-4"></div>

      {/* Enhanced Add Integration Form */}
      {showAddForm && (
        <div className="mx-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Integration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Integration Name</label>
                <input
                  type="text"
                  placeholder="Enter integration name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={newConnector.name}
                  onChange={(e) => setNewConnector({ ...newConnector, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Icon URL</label>
                <input
                  type="text"
                  placeholder="Enter icon URL"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={newConnector.icon}
                  onChange={(e) => setNewConnector({ ...newConnector, icon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <input
                  type="text"
                  placeholder="Enter description"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={newConnector.description}
                  onChange={(e) => setNewConnector({ ...newConnector, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Connect URL</label>
                <input
                  type="text"
                  placeholder="Enter connect URL"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={newConnector.connectUrl}
                  onChange={(e) => setNewConnector({ ...newConnector, connectUrl: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={handleAddIntegration}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Add Integration
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-8 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Connectors Grid */}
      <div className="px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {connectors.map((connector) => (
            <div
              key={connector.name}
              className="group relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
            >
              {/* Professional gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-2xl"></div>
              </div>

              {/* Card content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                      <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <Image
                          src={connector.icon}
                          alt={connector.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNCIgZmlsbD0iI0U1RTdFQiIvPgo8cGF0aCBkPSJNMTYgOEwxNiAyNE04IDhMMjQgOCIgc3Ryb2tlPSIjOTRBM0Y2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K';
                          }}
                        />
                      </div>
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 to-indigo-500/30 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {connector.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Available</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemove(connector.name)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  {connector.description}
                </p>

                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    onClick={() => {
                      if (connector.name === 'WhatsApp') {
                        window.location.href = '/WhatsApp-Integration';
                      } else if (connector.name === 'Instagram') {
                        window.location.href = '/Instagram-Integration';
                      } else if (connector.name === 'Telegram') {
                        window.location.href = '/telegram-integration';
                      } else {
                        window.open(connector.connectUrl, '_blank');
                      }
                    }}
                  >
                    Configure
                  </button>
                  <button
                    className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300"
                    onClick={() => handleRemove(connector.name)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
