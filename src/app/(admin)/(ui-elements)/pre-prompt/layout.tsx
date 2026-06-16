import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Pre-prompt | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Pre-prompt page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function PrePromptLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
} 
