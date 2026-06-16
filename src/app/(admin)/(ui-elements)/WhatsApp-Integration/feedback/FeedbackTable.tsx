// this is the client-side code for the FeedbackTable component



 

"use client";



 

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import { CalenderIcon } from "@/icons";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";



 

type FeedbackItem = {
 _id: string;
 timestamp?: string;
 user_id?: string;
 session_id?: string;
 role?: string;
 rating?: string;
 comment?: string;
};



 

type FeedbackListResponse = {
 items: FeedbackItem[];
 total: number;
 page: number;
 page_size: number;
};



 

interface FeedbackTableProps {
 apiBaseUrl: string;
}



 

const containerClass =
 "overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]";



 

export default function FeedbackTable({ apiBaseUrl }: FeedbackTableProps) {
 const [items, setItems] = useState<FeedbackItem[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [pageSize, setPageSize] = useState(20);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);



 

 const [role, setRole] = useState("");
 const [rating, setRating] = useState("");
 // live input values (update on every keystroke)
 const [userIdInput, setUserIdInput] = useState("");
 const [sessionIdInput, setSessionIdInput] = useState("");
 const [q, setQ] = useState("");
 const [dtFrom, setDtFrom] = useState("");
 const [dtTo, setDtTo] = useState("");



 

 // Reset page to 1 whenever filters change
 useEffect(() => {
 setPage(1);
 }, [role, rating, userIdInput, sessionIdInput, q, dtFrom, dtTo]);



 

 // Flatpickr instances for date-time pickers
 const dtFromInputRef = useRef<HTMLInputElement | null>(null);
 const dtToInputRef = useRef<HTMLInputElement | null>(null);
 const dtFromPickerRef = useRef<flatpickr.Instance | null>(null);
 const dtToPickerRef = useRef<flatpickr.Instance | null>(null);



 

 const formatLocalDateTime = (d: Date) => {
 const pad = (n: number) => String(n).padStart(2, "0");
 const yyyy = d.getFullYear();
 const mm = pad(d.getMonth() + 1);
 const dd = pad(d.getDate());
 const hh = pad(d.getHours());
 const mi = pad(d.getMinutes());
 return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
 };



 

 useEffect(() => {
 if (dtFromInputRef.current) {
 dtFromPickerRef.current = flatpickr(dtFromInputRef.current, {
 enableTime: true,
 time_24hr: true,
 dateFormat: "Y-m-d\\TH:i",
 static: true,
 defaultDate: dtFrom || undefined,
 onChange: (selectedDates) => {
 if (selectedDates[0]) setDtFrom(formatLocalDateTime(selectedDates[0]));
 },
 }) as unknown as flatpickr.Instance;
 }
 if (dtToInputRef.current) {
 dtToPickerRef.current = flatpickr(dtToInputRef.current, {
 enableTime: true,
 time_24hr: true,
 dateFormat: "Y-m-d\\TH:i",
 static: true,
 defaultDate: dtTo || undefined,
 onChange: (selectedDates) => {
 if (selectedDates[0]) setDtTo(formatLocalDateTime(selectedDates[0]));
 },
 }) as unknown as flatpickr.Instance;
 }
 return () => {
 dtFromPickerRef.current?.destroy();
 dtToPickerRef.current?.destroy();
 };
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);



 

 useEffect(() => {
 // keep pickers in sync when state changes via Reset
 if (dtFromPickerRef.current && !dtFrom) dtFromPickerRef.current.clear();
 if (dtToPickerRef.current && !dtTo) dtToPickerRef.current.clear();
}, [dtFrom, dtTo]);



 

const queryString = useMemo(() => {
 const params = new URLSearchParams();
 params.set("page", String(page));
 params.set("page_size", String(pageSize));
 // do not send role/rating/user_id/session_id; handled via client-side live filtering for partial matching
 if (q) params.set("q", q);
 if (dtFrom) params.set("dt_from", dtFrom);
 if (dtTo) params.set("dt_to", dtTo);
 return params.toString();
}, [page, pageSize, q, dtFrom, dtTo]);



 

 useEffect(() => {
 let ignore = false;
 const fetchData = async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${apiBaseUrl}/feedback?${queryString}`, {
 headers: { accept: "application/json" },
 cache: "no-store",
 });
 if (!res.ok) throw new Error("Failed to load feedback");
 const json = (await res.json()) as FeedbackListResponse;
 if (!ignore) {
 setItems(json.items || []);
 setTotal(json.total || 0);
 }
 } catch (e) {
 if (!ignore) setError(e instanceof Error ? e.message : "Error fetching data");
 } finally {
 if (!ignore) setLoading(false);
 }
 };
 fetchData();
 return () => {
 ignore = true;
 };
 }, [apiBaseUrl, queryString]);



 

 const totalPages = Math.max(1, Math.ceil(total / pageSize));



 

 const handleExport = async () => {
 const params = new URLSearchParams();
 // Include all filters for export (API may handle them differently)
 if (role) params.set("role", role);
 if (rating) params.set("rating", rating);
 if (userIdInput.trim()) params.set("user_id", userIdInput.trim());
 if (sessionIdInput.trim()) params.set("session_id", sessionIdInput.trim());
 if (q) params.set("q", q);
 if (dtFrom) params.set("dt_from", dtFrom);
 if (dtTo) params.set("dt_to", dtTo);
 const url = `${apiBaseUrl}/feedback/export?${params.toString()}`;
 try {
 const res = await fetch(url, { method: "GET" });
 if (!res.ok) {
 const text = await res.text().catch(() => "");
 throw new Error(text || "Failed to export CSV");
 }
 const blob = await res.blob();
 const downloadUrl = window.URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = downloadUrl;
 a.download = "feedback_export.csv";
 document.body.appendChild(a);
 a.click();
 a.remove();
 window.URL.revokeObjectURL(downloadUrl);
  } catch (e) {
  console.error(e);
 alert(e instanceof Error ? e.message : "Failed to export CSV");
 }
 };



 

 const displayItems = useMemo(() => {
 const uid = userIdInput.trim().toLowerCase();
 const sid = sessionIdInput.trim().toLowerCase();
 const roleFilter = role.trim().toLowerCase();
 const ratingFilter = rating.trim().toLowerCase();
 
 // If no filters are applied, return all items
 if (!uid && !sid && !roleFilter && !ratingFilter) return items;
 
 return items.filter((it) => {
 const u = (it.user_id || "").toLowerCase();
 const s = (it.session_id || "").toLowerCase();
 const r = (it.role || "").toLowerCase();
 const rt = (it.rating || "").toLowerCase();
 
 const uidOk = uid ? u.includes(uid) : true;
 const sidOk = sid ? s.includes(sid) : true;
 const roleOk = roleFilter ? r.includes(roleFilter) : true;
 const ratingOk = ratingFilter ? rt.includes(ratingFilter) : true;
 
 return uidOk && sidOk && roleOk && ratingOk;
});
}, [items, userIdInput, sessionIdInput, role, rating]);



 

 return (
 <div className="w-full">
 <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 <div>
 <Label htmlFor="role">Role</Label>
 <input
 id="role"
 placeholder="e.g. user, assistant"
 value={role}
 onChange={(e) => setRole(e.target.value)}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 />
 </div>
 <div>
 <Label htmlFor="rating">Rating</Label>
 <input
 id="rating"
 placeholder="positive | neutral | negative"
 value={rating}
 onChange={(e) => setRating(e.target.value)}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 />
 </div>
 <div>
 <Label htmlFor="q">Search in Comment</Label>
 <input
 id="q"
 placeholder="keyword..."
 value={q}
 onChange={(e) => setQ(e.target.value)}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 />
 </div>
 <div>
 <Label htmlFor="userId">User ID</Label>
 <input
 id="userId"
 placeholder="phone or id"
 value={userIdInput}
 onChange={(e) => setUserIdInput(e.target.value)}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 />
 </div>
 <div>
 <Label htmlFor="sessionId">Session ID</Label>
 <input
 id="sessionId"
 placeholder="session id"
 value={sessionIdInput}
 onChange={(e) => setSessionIdInput(e.target.value)}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <Label htmlFor="dtFrom">From</Label>
 <div className="relative">
 <input
 ref={dtFromInputRef}
 id="dtFrom"
 placeholder="YYYY-MM-DDTHH:MM"
 value={dtFrom}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 readOnly
 />
 <button
 type="button"
 onClick={() => dtFromPickerRef.current?.open()}
 className="absolute text-gray-500 -translate-y-1/2 right-3 top-1/2 dark:text-gray-400"
 aria-label="Open from calendar"
 >
 <CalenderIcon className="size-6" />
 </button>
 </div>
 </div>
 <div>
 <Label htmlFor="dtTo">To</Label>
 <div className="relative">
 <input
 ref={dtToInputRef}
 id="dtTo"
 placeholder="YYYY-MM-DDTHH:MM"
 value={dtTo}
 className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
 readOnly
 />
 <button
 type="button"
 onClick={() => dtToPickerRef.current?.open()}
 className="absolute text-gray-500 -translate-y-1/2 right-3 top-1/2 dark:text-gray-400"
 aria-label="Open to calendar"
 >
 <CalenderIcon className="size-6" />
 </button>
 </div>
 </div>
 </div>
 <div className="flex items-end gap-3">
 <Button variant="outline" onClick={() => {
 setRole("");
 setRating("");
 setUserIdInput("");
 setSessionIdInput("");
 setQ("");
 setDtFrom("");
 setDtTo("");
 dtFromPickerRef.current?.clear();
 dtToPickerRef.current?.clear();
 }}>Reset</Button>
 <Button variant="outline" onClick={handleExport}>Export CSV</Button>
 </div>
 </div>



 

 <div className={containerClass}>
 <div className="max-w-full overflow-x-auto">
 <div className="min-w-[900px] xl:min-w-full">
 <Table>
 <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
 <TableRow>
 <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Timestamp</TableCell>
 <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">User</TableCell>
 <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Session</TableCell>
 <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Role</TableCell>
 <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Rating</TableCell>
 <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Comment</TableCell>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
 {loading ? (
 <TableRow><TableCell colSpan={6} className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">Loading...</TableCell></TableRow>
 ) : error ? (
 <TableRow><TableCell colSpan={6} className="px-5 py-6 text-center text-red-500">{error}</TableCell></TableRow>
 ) : displayItems.length === 0 ? (
 <TableRow><TableCell colSpan={6} className="px-5 py-6 text-center text-gray-500 dark:text-gray-400">No data</TableCell></TableRow>
 ) : (
 displayItems.map((it) => (
 <TableRow key={it._id}>
 <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">{it.timestamp ? new Date(it.timestamp).toLocaleString() : "-"}</TableCell>
 <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">{it.user_id || "-"}</TableCell>
 <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">{it.session_id || "-"}</TableCell>
 <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">{it.role || "-"}</TableCell>
 <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm capitalize">{it.rating || "-"}</TableCell>
 <TableCell className="px-5 py-3 text-gray-700 dark:text-gray-300 text-theme-sm">{it.comment || ""}</TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3">
 <div className="text-gray-600 dark:text-gray-400 text-theme-sm">Page {page} of {totalPages} • Total {total}</div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
 <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
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
