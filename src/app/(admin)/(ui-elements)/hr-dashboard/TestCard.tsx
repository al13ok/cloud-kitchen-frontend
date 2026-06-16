"use client"

import ComponentCard from "@/components/common/ComponentCard"
import { useTheme } from "@/context/ThemeContext"

export default function TestCard() {
  const { theme } = useTheme()
  
  return (
    <div className="p-4">
      <ComponentCard title="Test Card">
        <div className="space-y-2">
          <p className="text-gray-700 dark:text-gray-300">
            This is a test card to verify the import is working.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Current theme: <span className="font-medium capitalize">{theme}</span>
          </p>
        </div>
      </ComponentCard>
    </div>
  )
}