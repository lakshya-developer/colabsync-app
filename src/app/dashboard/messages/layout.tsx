'use client';

/**
 * Messages Layout
 *
 * Overrides the parent dashboard layout's `p-6 overflow-y-auto` main wrapper
 * by using negative margins + h-full to fill the entire main area edge-to-edge.
 * This gives us a full-height, full-width chat container.
 */

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] overflow-hidden">
      {children}
    </div>
  );
}
