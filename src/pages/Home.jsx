import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Layers } from 'lucide-react';
import { getAllTools } from '../config/toolRegistry.js';

export default function Home() {
  const tools = getAllTools();

  return (
    <div className="py-8">
      {/* Hero Placeholder */}
      <div className="glass-panel mx-auto max-w-3xl p-8 text-center sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>FND-04 Routing Active</span>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
          PDFTooling Home
        </h1>
        <p className="mt-3 text-base text-secondary max-w-xl mx-auto">
          Private, fast, browser-based PDF utilities. All operations execute strictly on your device.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/tools"
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-heading text-sm font-semibold text-accent-contrast shadow-sm hover:bg-accent-hover transition-colors"
          >
            <span>Browse All Tools</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Featured Tools Placeholder Grid */}
      <div className="mt-12">
        <h2 className="font-heading text-xl font-bold text-primary mb-4">
          Core PDF Operations
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              to={tool.route}
              className="glass-panel p-5 hover:border-accent/50 transition-all hover:-translate-y-0.5 focus-ring block"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-semibold text-primary">
                    {tool.name}
                  </h3>
                  <span className="text-xs text-muted capitalize">{tool.category}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-secondary line-clamp-2">
                {tool.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
