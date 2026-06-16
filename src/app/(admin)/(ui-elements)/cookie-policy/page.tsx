'use client';

import React from 'react';
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import CookieManager from "@/components/common/CookieManager";

export default function CookiePolicyPage() {
  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Cookie Policy" />
      
      <ComponentCard title="Cookie Management">
        <div className="space-y-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3>Cookie Policy</h3>
            <p>
              This page allows you to manage your cookie preferences and view all cookies stored on your device.
              You can customize which types of cookies you want to allow and view detailed information about each cookie.
            </p>
            
            <h4>Cookie Types</h4>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for basic site functionality. These cannot be disabled.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our site.</li>
              <li><strong>Marketing Cookies:</strong> Used to deliver personalized advertisements.</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings.</li>
            </ul>
            
            <h4>Your Rights</h4>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Accept or decline non-essential cookies</li>
              <li>Change your preferences at any time</li>
              <li>Delete specific cookies or all cookies</li>
              <li>Request information about how your data is used</li>
            </ul>
          </div>
          
          <CookieManager />
        </div>
      </ComponentCard>
    </div>
  );
}
