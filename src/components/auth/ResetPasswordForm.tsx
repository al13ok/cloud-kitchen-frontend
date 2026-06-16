"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";

import { Lock, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface ValidationErrors {
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

const ResetPasswordForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [verifying, setVerifying] = useState(true);

  const verifyToken = useCallback(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/verify-reset-token?token=${token}`);
      if (response.ok) {
        const data = await response.json();
        setTokenValid(true);
        setUserEmail(data.email);
      } else {
        setErrors({ general: 'Invalid or expired reset link' });
      }
    } catch {
      setErrors({ general: 'Failed to verify reset link' });
    } finally {
      setVerifying(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
    }
  }, [token, verifyToken]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
    if (field === 'newPassword') {
      setNewPassword(value);
      if (errors.newPassword) {
        setErrors(prev => ({ ...prev, newPassword: undefined }));
      }
    } else {
      setConfirmPassword(value);
      if (errors.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          new_password: newPassword 
        }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setErrors({ general: data.detail || 'Failed to reset password' });
      }
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Invalid Reset Link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            This reset link is invalid. Please request a new password reset.
          </p>
        </div>
        
        <div className="text-center">
          <button
            onClick={() => router.push('/forgot-password')}
            className="cursor-pointer bg-gradient-to-b from-blue-600 to-blue-700 shadow-[0px_4px_32px_0_rgba(37,99,235,.70)] px-6 py-3 rounded-xl border-[1px] border-blue-500 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Request New Reset
          </button>
        </div>
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Verifying Reset Link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Please wait while we verify your reset link...
          </p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Invalid Reset Link
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {errors.general || 'This reset link is invalid or has expired.'}
          </p>
        </div>
        
        <div className="text-center">
          <button
            onClick={() => router.push('/forgot-password')}
            className="cursor-pointer bg-gradient-to-b from-blue-600 to-blue-700 shadow-[0px_4px_32px_0_rgba(37,99,235,.70)] px-6 py-3 rounded-xl border-[1px] border-blue-500 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Request New Reset
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="flex justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Password Reset Successfully
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Your password has been reset successfully.
          </p>
        </div>
        
        <div className="text-center">
          <button
            onClick={() => router.push('/signin')}
            className="cursor-pointer bg-gradient-to-b from-blue-600 to-blue-700 shadow-[0px_4px_32px_0_rgba(37,99,235,.70)] px-6 py-3 rounded-xl border-[1px] border-blue-500 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter your new password for {userEmail}
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Password
          </Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => handleInputChange('newPassword', e.target.value)}
            error={!!errors.newPassword}
            className="mt-1"
            placeholder="Enter new password"
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>
          )}
        </div>
        
        <div>
          <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm New Password
          </Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            error={!!errors.confirmPassword}
            className="mt-1"
            placeholder="Confirm new password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
          )}
        </div>
        
        {errors.general && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
          </div>
        )}
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer bg-gradient-to-b from-blue-600 to-blue-700 shadow-[0px_4px_32px_0_rgba(37,99,235,.70)] px-6 py-3 rounded-xl border-[1px] border-blue-500 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResetPasswordForm; 