import React, { ReactNode } from 'react';

export default function EssLayout({ children }: { children: ReactNode }) {
  return (
    <section className="p-4">
      {children}
    </section>
  );
}


