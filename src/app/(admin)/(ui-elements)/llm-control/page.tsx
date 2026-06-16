'use client';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import React, { useState} from "react";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";

const DEFAULT_NUM_RESULTS = 15;
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

export default function LLMControl() {
  const [numResults, setNumResults] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('numResults')) || DEFAULT_NUM_RESULTS;
    }
    return DEFAULT_NUM_RESULTS;
  });
  
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('similarityThreshold')) || DEFAULT_SIMILARITY_THRESHOLD;
    }
    return DEFAULT_SIMILARITY_THRESHOLD;
  });

  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"success" | "error">("success");

  const handleSave = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('numResults', numResults.toString());
        localStorage.setItem('similarityThreshold', similarityThreshold.toString());
        
        // Dispatch custom event to notify chat UI of settings change
        const event = new CustomEvent('llmSettingsChanged', {
          detail: {
            numResults,
            similarityThreshold
          }
        });
        window.dispatchEvent(event);

        setAlertMessage("Settings saved successfully");
        setAlertType("success");
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setAlertMessage("Error saving settings");
      setAlertType("error");
    }

    // Clear alert after 3 seconds
    setTimeout(() => {
      setAlertMessage("");
    }, 3000);
  };

  const handleReset = () => {
    setNumResults(DEFAULT_NUM_RESULTS);
    setSimilarityThreshold(DEFAULT_SIMILARITY_THRESHOLD);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('numResults', DEFAULT_NUM_RESULTS.toString());
      localStorage.setItem('similarityThreshold', DEFAULT_SIMILARITY_THRESHOLD.toString());
      
      // Dispatch custom event to notify chat UI of settings change
      const event = new CustomEvent('llmSettingsChanged', {
        detail: {
          numResults: DEFAULT_NUM_RESULTS,
          similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD
        }
      });
      window.dispatchEvent(event);

      setAlertMessage("Settings reset to default values");
      setAlertType("success");
    }

    // Clear alert after 3 seconds
    setTimeout(() => {
      setAlertMessage("");
    }, 3000);
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="LLM Control" />
      {alertMessage && (
        <div className="mb-4">
          <Alert
            variant={alertType}
            title={alertType === "success" ? "Success" : "Error"}
            message={alertMessage}
            showLink={false}
          />
        </div>
      )}
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="API Settings">
          <div className="space-y-6">
            {/* Number of Results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Results: {numResults}
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={numResults}
                onChange={(e) => setNumResults(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>10</span>
                <span>50</span>
              </div>
            </div>

            {/* Similarity Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Similarity Threshold: {similarityThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.01"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0.0</span>
                <span>5.0</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <Button 
                size="md" 
                variant="outline" 
                onClick={handleReset}
              >
                Reset to Default
              </Button>
              <Button 
                size="md" 
                variant="primary" 
                onClick={handleSave}
              >
                Save Settings
              </Button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </div>
  );
}
