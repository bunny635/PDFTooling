import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight } from 'lucide-react';
import { getAllTools } from '../config/toolRegistry.js';

export default function AllTools() {
  const tools = getAllTools();

  return (
    <div className="py-6">
      <div className="mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
          All PDF Tools
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Explore all six browser-powered PDF tools. Zero file uploads, 100% private.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="glass-panel flex flex-col justify-between p-6 hover:border-accent/40 transition-all focus-within:ring-2 focus-within:ring-accent"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Layers className="h-6 w-6" aria-hidden="true" />
                </div>
                <span className="glass-pill px-2.5 py-1 text-[11px] font-semibold text-accent uppercase tracking-wider">
                  {tool.category}
                </span>
              </div>
              <h2 className="mt-4 font-heading text-lg font-bold text-primary">
                {tool.name}
              </h2>
              <p className="mt-2 text-xs text-secondary leading-relaxed">
                {tool.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border-subtle">
              <Link
                to={tool.route}
                className="focus-ring inline-flex items-center justify-between w-full text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
              >
                <span>Open {tool.name}</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
