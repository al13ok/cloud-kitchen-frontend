import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Direct DB",
  description:
    "This is Next.js Buttons page for TailAdmin - Next.js Tailwind CSS Admin Direct DB Template",
};

export default function DirectDBPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Direct DB" />
      
    </div>
  );
}
