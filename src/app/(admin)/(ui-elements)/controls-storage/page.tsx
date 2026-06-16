
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Storage",
  description:
    "This is Next.js Buttons page for TailAdmin - Next.js Tailwind CSS Admin Storage Template",
};

export default function StoragePage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Storage" />
      
    </div>
  );
}
