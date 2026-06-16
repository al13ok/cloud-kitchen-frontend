import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Subscription",
  description:
    "This is Next.js Buttons page for TailAdmin - Next.js Tailwind CSS Admin Subscription Template",
};

export default function SubscriptionPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Subscription" />
      
    </div>
  );
}
