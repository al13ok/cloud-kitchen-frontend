"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAllSurveyFeedback } from "@/utils/api";

interface SurveyResponse {
  feedback_id?: string;
  email: string;
  survey_id?: string;
  rating: number;
  comment: string;
  submitted_date: string;
}

interface ViewResponsesProps {
  surveyId?: string;
}

const ViewResponses: React.FC<ViewResponsesProps> = ({ surveyId = "" }) => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      console.log('📋 ViewResponses: Fetching survey responses...');
      const response = await getAllSurveyFeedback();
      console.log('📋 ViewResponses: Data received:', response);
      
      const data = response.feedbacks || [];
      setResponses(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching survey responses:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch responses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
    
    // Set up polling for auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      fetchResponses();
    }, 10000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [surveyId]);

  const getScoreTag = (score: number) => {
    if (score >= 9) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-500">{score} (NPS)</span>;
    } else if (score >= 7) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-500">{score} (CSAT)</span>;
    } else if (score >= 5) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-500">{score} (CES)</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-500">{score} (CSAT)</span>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-400">Loading responses...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-100 rounded-md">
        <p>{error}</p>
        <button 
          onClick={fetchResponses}
          className="px-4 py-2 mt-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg text-gray-400">No responses yet</p>
        <button 
          onClick={fetchResponses}
          className="px-4 py-2 mt-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Survey Responses</h2>
        <button 
          onClick={fetchResponses}
          className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Refresh Data
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-800 text-left">
              <th className="p-3 text-xs font-medium text-gray-400 uppercase">User</th>
              <th className="p-3 text-xs font-medium text-gray-400 uppercase">Survey</th>
              <th className="p-3 text-xs font-medium text-gray-400 uppercase">Score</th>
              <th className="p-3 text-xs font-medium text-gray-400 uppercase">Comment</th>
              <th className="p-3 text-xs font-medium text-gray-400 uppercase">Date</th>
              <th className="p-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((response, index) => (
              <tr 
                key={index} 
                className="border-b border-gray-700 hover:bg-gray-800/50"
              >
                <td className="p-3">
                  <div className="flex items-center">
                    <div className="w-8 h-8 mr-3 overflow-hidden bg-gray-700 rounded-full">
                      <span className="flex items-center justify-center w-full h-full text-white">
                        {response.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-white">{response.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-white">{response.survey_id || 'N/A'}</td>
                <td className="p-3">{getScoreTag(response.rating)}</td>
                <td className="p-3 text-white max-w-xs truncate">{response.comment}</td>
                <td className="p-3 text-white">{formatDate(response.submitted_date)}</td>
                <td className="p-3">
                  {/* Actions - Leave empty for now */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewResponses;