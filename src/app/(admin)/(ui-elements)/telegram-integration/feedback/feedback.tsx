"use client";

import React, { useEffect, useState, useRef } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import { Calendar } from "lucide-react";

const BASE_API_URL = "https://telegram-aiagent.mobiloitte.io";

type TelegramFeedback = {
  _id: string;
  chat_id: string;
  rating: number;
  feedback_type: string;
  source: string;
  message: string;
  user_email: string | null;
  user_name: string | null;
  user_type: string;
  category: string | null;
  related_id: string | null;
  session_id: string;
  submitted_at: string;
  created_at: string;
};


export default function TelegramFeedbackModule() {
  const [items, setItems] = useState<TelegramFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [rating, setRating] = useState("");
  const [chatIdInput, setChatIdInput] = useState("");
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [userType, setUserType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Refs for date inputs
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFeedback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, rating, chatIdInput, sessionIdInput, searchKeyword, userType, dateFrom, dateTo]);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate skip based on page and pageSize
      const skip = (page - 1) * pageSize;
      
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        skip: skip.toString(),
      });

      // Add filters to params
      if (rating) params.append("rating", rating);
      if (chatIdInput) params.append("chat_id", chatIdInput);
      if (sessionIdInput) params.append("session_id", sessionIdInput);
      if (searchKeyword) params.append("q", searchKeyword);
      if (userType) params.append("user_type", userType);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      // Use the API endpoint
      const url = `${BASE_API_URL}/api/telegram/feedback?${params}`;
      console.log("Fetching feedback from:", url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        throw new Error(`Failed to fetch feedback: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      console.log("Data type:", typeof data);
      console.log("Is array:", Array.isArray(data));
      
      // Handle different response formats
      let feedbackItems: TelegramFeedback[] = [];
      let totalCount = 0;
      
      if (Array.isArray(data)) {
        // Response is directly an array
        feedbackItems = data;
        totalCount = data.length;
      } else if (data.items && Array.isArray(data.items)) {
        // Response has items property
        feedbackItems = data.items;
        totalCount = data.total || data.items.length;
      } else if (data.data && Array.isArray(data.data)) {
        // Response has data property
        feedbackItems = data.data;
        totalCount = data.total || data.count || data.data.length;
      } else if (data.results && Array.isArray(data.results)) {
        // Response has results property
        feedbackItems = data.results;
        totalCount = data.total || data.count || data.results.length;
      }
      
      console.log("Processed items:", feedbackItems);
      console.log("Total count:", totalCount);
      
      setItems(feedbackItems);
      setTotal(totalCount);
    } catch (err) {
      console.error("Fetch error:", err);
      
      let errorMessage = "An error occurred";
      
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        errorMessage = "Cannot connect to API server. Possible causes:\n" +
          "1. API server is not running\n" +
          "2. CORS is not enabled on the API\n" +
          "3. Network connection issue\n" +
          "4. API URL is incorrect\n\n" +
          `Current API: ${BASE_API_URL}/api/telegram/feedback`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRating("");
    setChatIdInput("");
    setSessionIdInput("");
    setSearchKeyword("");
    setUserType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleExportCSV = () => {
    // CSV export logic
    const csvContent = [
      ["Chat ID", "Rating", "Feedback Type", "Source", "Message", "User Email", "User Name", "User Type", "Category", "Related ID", "Session ID", "Submitted At", "Created At"],
      ...items.map(item => [
        item.chat_id,
        item.rating,
        item.feedback_type,
        item.source,
        `"${item.message.replace(/"/g, '""')}"`,
        item.user_email || "-",
        item.user_name || "-",
        item.user_type,
        item.category || "-",
        item.related_id || "-",
        item.session_id,
        new Date(item.submitted_at).toLocaleString(),
        item.created_at
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `telegram-feedback-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-2xl text-gray-900 dark:text-white flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          Feedback Management
        </h2>
      </div>
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Feedback</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
            <input
              type="number"
              placeholder="1-5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              min="1"
              max="5"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* User Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User Type</label>
            <input
              type="text"
              placeholder="e.g., guest"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date From</label>
            <div className="relative">
              <input
                ref={dateFromRef}
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => dateFromRef.current?.showPicker()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date To</label>
            <div className="relative">
              <input
                ref={dateToRef}
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => dateToRef.current?.showPicker()}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search in Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search in Message</label>
            <input
              type="text"
              placeholder="keyword..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Chat ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chat ID</label>
            <input
              type="text"
              placeholder="chat id"
              value={chatIdInput}
              onChange={(e) => setChatIdInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Session ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session ID</label>
            <input
              type="text"
              placeholder="session id"
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button onClick={handleReset} variant="outline">Reset</Button>
          <Button onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Debug Info */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Error:</h4>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">Check browser console (F12) for more details</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">No Data Found</h4>
          <p className="text-yellow-700 dark:text-yellow-300">The API returned no feedback items. This could mean:</p>
          <ul className="list-disc list-inside text-sm text-yellow-600 dark:text-yellow-400 mt-2">
            <li>No feedback exists in the database</li>
            <li>Filters are too restrictive</li>
            <li>API endpoint is not returning data correctly</li>
          </ul>
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">Check browser console (F12) for API response details</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[900px] xl:min-w-full">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Chat ID</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Rating</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Source</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Message</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User Type</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Category</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Session ID</TableCell>
                  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Submitted At</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">Loading...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-6 text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">No data</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">
                        {item.chat_id || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span>{item.rating || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm capitalize">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {item.feedback_type || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm capitalize">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {item.source || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">
                        <div className="max-w-xs truncate" title={item.message}>
                          {item.message || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm capitalize">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {item.user_type || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">
                        {item.category || "-"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm font-mono text-xs">
                        {item.session_id ? item.session_id.substring(0, 20) + "..." : "-"}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm whitespace-nowrap">
                        {new Date(item.submitted_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3">
          <div className="text-gray-600 dark:text-gray-400 text-theme-sm">
            Page {page} of {Math.ceil(total / pageSize) || 1} • Total {total}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))} 
              disabled={page >= Math.ceil(total / pageSize)}
            >
              Next
            </Button>
            <select
              className="ml-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
            >
              {[10, 20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}/page</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
