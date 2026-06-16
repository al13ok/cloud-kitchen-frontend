"use client";
import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";
// import { getLogoUrl } from "@/utils/s3Config";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDemoPage = pathname === '/demo';
  const isSignInPage = pathname === '/signin';

  return (
    <div className="relative bg-white z-1 dark:bg-gray-900">
      <ThemeProvider>
        {isSignInPage ? (
          // For signin page, let the component handle its own layout
          children
        ) : (
          // For other auth pages, use the original layout
          <div className={`relative flex w-full h-screen ${isDemoPage ? 'justify-center' : 'lg:flex-row justify-between flex-col'} dark:bg-gray-900`}>
            {children}
            {!isDemoPage && (
              <div className="lg:w-[35%] w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
                <div className="relative items-center justify-center flex z-1">
                  <GridShape />
                  <div className="flex flex-col items-center max-w-xs gap-4">
                    <Link href="/" className="flex items-center justify-center">
                      <Image
                        width={120}
                        height={120}
                        src={"/images/logo/M-LOGO_1.png"}
                        alt="M Logo"
                        priority
                      />
                    </Link>
                    <div className="text-center">
                      <p className="text-white text-3xl font-bold mb-2">
                        Converiqo
                      </p>
                      <p className="text-white/90 text-lg font-medium tracking-wide">
                        Conversations Re-imagined.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!isDemoPage && (
              <div className="fixed bottom-12 right-6 z-50 hidden sm:block">
                <ThemeTogglerTwo />
              </div>
            )}
          </div>
        )}
      </ThemeProvider>
    </div>
  );
}
