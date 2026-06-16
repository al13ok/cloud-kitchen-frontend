"use client";

import React, { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import ErrorBoundary from '../components/ErrorBoundary';
// import LoadingSpinner from '../components/LoadingSpinner';
// import { formatTime12Hour } from '../utils/timeUtils';
import { API_URLS } from '../config/api';

const ChatPage: React.FC = () => {
	const [user, setUser] = useState<{name: string, email?: string} | null>(null);
	const [showLogin, setShowLogin] = useState(false);
	const [loginForm, setLoginForm] = useState({name: '', email: '', phone: ''});
	const [loading, setLoading] = useState(false);
	const [, setBookingState] = useState<Record<string, unknown>>({});

	useEffect(() => {
		const userId = localStorage.getItem('USER_ID');
		const token = localStorage.getItem('ACCESS_TOKEN');
		if (userId && token) {
			// Fetch real user details from backend
			fetchUserDetails(token);
		}
	}, []);

	const fetchUserDetails = async (token: string) => {
		try {
			const res = await fetch(API_URLS.AUTH_ME, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			if (res.ok) {
				const userData = await res.json();
				setUser({name: userData.name, email: userData.email});
			}
		} catch (e) {
			console.error('Failed to fetch user details:', e);
		}
	};

	const handleLogin = async () => {
		try {
			setLoading(true);
			const res = await fetch(API_URLS.AUTH_LOGIN, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(loginForm)
			});
			if (!res.ok) throw new Error('Login failed');
			const data = await res.json();
			localStorage.setItem('USER_ID', data.user_id);
			localStorage.setItem('ACCESS_TOKEN', data.access_token);
			// Fetch real user details after login
			await fetchUserDetails(data.access_token);
			setShowLogin(false);
		} catch (e: unknown) {
			const error = e as Error;
			alert('Login failed: ' + error.message);
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem('USER_ID');
		localStorage.removeItem('ACCESS_TOKEN');
		setUser(null);
	};

	return (
		<ErrorBoundary>
			<div className="min-h-screen bg-gray-50">
				<div className="flex flex-col h-screen">
					{/* Simple Header */}
					<div className="bg-blue-600 text-white px-6 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
									<span className="text-lg">📅</span>
								</div>
								<div>
									<h1 className="text-xl font-bold">AI Booking Assistant</h1>
									<p className="text-purple-100 text-sm">Book appointments through natural conversation</p>
								</div>
							</div>
							
							<div className="flex items-center space-x-3">
								{user ? (
									<>
										<div className="text-right">
											<div className="font-semibold text-sm">{user.name}</div>
											{user.email && <div className="text-purple-100 text-xs">{user.email}</div>}
										</div>
										<div className="flex items-center space-x-2">
											<a href="/appointment/appointments" className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors">
												📋 My Appointments
											</a>
											<button onClick={handleLogout} className="px-3 py-2 bg-white text-purple-600 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
												Logout
											</button>
										</div>
									</>
								) : (
									<a href="/appointment/login" className="px-4 py-2 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
										Get Started
									</a>
								)}
							</div>
						</div>
					</div>

					{/* Main Chat Area */}
					<div className="flex-1 flex flex-col overflow-hidden">
						<div className="flex-1 min-h-0">
							<ChatBox onBookingStateChange={(s) => setBookingState(s)} isLoggedIn={Boolean(user)} />
						</div>
					</div>

				{/* Login Modal */}
				{showLogin && (
					<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
						<div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-2xl">
							<div className="text-center mb-6">
								<div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-white text-2xl">🔐</span>
								</div>
								<h3 className="text-2xl font-bold text-gray-800">Login / Sign Up</h3>
								<p className="text-gray-600 mt-2">Enter your details to continue</p>
							</div>
							<div className="space-y-4">
								<input 
									className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500" 
									placeholder="Name" 
									value={loginForm.name} 
									onChange={(e) => setLoginForm({...loginForm, name: e.target.value})} 
								/>
								<input 
									className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500" 
									placeholder="Email (optional)" 
									value={loginForm.email} 
									onChange={(e) => setLoginForm({...loginForm, email: e.target.value})} 
								/>
								<input 
									className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-500" 
									placeholder="Phone (optional)" 
									value={loginForm.phone} 
									onChange={(e) => setLoginForm({...loginForm, phone: e.target.value})} 
								/>
								<div className="flex gap-3 pt-4">
									<button 
										onClick={handleLogin} 
										className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-white font-medium shadow-sm hover:shadow-md" 
										disabled={loading || !loginForm.name}
									>
										{loading ? 'Please wait...' : 'Continue'}
									</button>
									<button 
										onClick={() => setShowLogin(false)} 
										className="px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-gray-700 font-medium"
									>
										Cancel
									</button>
								</div>
							</div>
						</div>
					</div>
				)}
				</div>
			</div>
		</ErrorBoundary>
	);
};

export default ChatPage;
