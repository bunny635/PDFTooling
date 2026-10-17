import React from 'react';
import { FileText, Shield, Sparkles } from 'lucide-react';

export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          PDFTooling
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          All-in-One Online PDF Toolkit. Private, fast, and 100% browser-based.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-500" />
            Client-Side Only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            FND-01 Initialized
          </span>
        </div>
      </div>
    </main>
  );
}
