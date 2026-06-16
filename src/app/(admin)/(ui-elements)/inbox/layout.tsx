import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Chat Inbox",
  description:
    "Manage chatbot and WhatsApp bot conversations - TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
