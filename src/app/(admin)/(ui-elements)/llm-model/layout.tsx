import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "LLM Model | TailAdmin - Next.js Dashboard Template",
  description:
    "This is LLM Model page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function LLMControlLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
} 
