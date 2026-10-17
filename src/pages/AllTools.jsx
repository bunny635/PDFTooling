import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  SearchX,
  Layers,
  Scissors,
  RotateCw,
  Trash2,
  ArrowUpDown,
  Image,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getAllTools } from '../config/toolRegistry.js';
import { GlassCard, GlassBadge, GlassButton } from '../components/glass/index.js';

// Map iconName strings from toolRegistry.js to Lucide React components
const TOOL_ICONS = {
  Layers,
  Scissors,
  RotateCw,
  Trash2,
  ArrowUpDown,
  Image,
};

// Human-readable category display names mapping
const CATEGORY_LABELS = {
  all: 'All Tools',
  organize: 'Organize',
  extract: 'Extract',
  edit: 'Edit',
  convert: 'Convert',
};

export default function AllTools() {
  const tools = getAllTools();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Derive unique categories from registry while preserving exact registry values
  const categories = useMemo(() => {
    const uniqueFromRegistry = Array.from(new Set(tools.map((t) => t.category)));
    return [
      { id: 'all', label: CATEGORY_LABELS.all },
      ...uniqueFromRegistry.map((cat) => ({
        id: cat,
        label: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
      })),
    ];
  }, [tools]);

  // Combined, case-insensitive, whitespace-trimmed search and category filtering
  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;

      const matchesSearch =
        !cleanQuery ||
        tool.name.toLowerCase().includes(cleanQuery) ||
        tool.description.toLowerCase().includes(cleanQuery);

      return matchesCategory && matchesSearch;
    });
  }, [tools, cleanQuery, selectedCategory]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const hasActiveFilters = Boolean(cleanQuery || selectedCategory !== 'all');

  return (
    <div className="py-6 sm:py-10 space-y-8">
      {/* 1. Header Section */}
      <div>
        <div className="inline-flex items-center gap-2 mb-3">
          <GlassBadge variant="accent" size="sm">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Client-Side Catalog</span>
          </GlassBadge>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
          All PDF Tools
        </h1>

        <p className="mt-2 text-sm sm:text-base text-secondary max-w-2xl leading-relaxed">
          Discover, search, and filter our suite of focused client-side PDF utilities. 
          Each tool operates directly within your browser session.
        </p>
      </div>

      {/* 2. Search & Category Discovery Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Accessible Search Input */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="tool-search" className="sr-only">
              Search tools by name or description
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-secondary">
              <Search className="h-4 w-4" aria-hidden="true" />
            </div>

            <input
              id="tool-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tool name or keyword..."
              className="w-full rounded-xl border border-border-subtle bg-surface/80 py-2.5 pl-10 pr-10 font-sans text-sm text-primary placeholder:text-muted backdrop-blur-sm transition-all duration-200 focus-ring focus:border-accent"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="focus-ring absolute inset-y-0 right-0 flex items-center pr-3 text-secondary hover:text-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Results Count and Reset Shortcut */}
          <div className="flex items-center gap-3">
            <span
              className="glass-pill px-3 py-1 text-xs font-medium text-secondary"
              aria-live="polite"
            >
              Showing {filteredTools.length} of {tools.length} tools
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-accent hover:underline focus-ring rounded-md py-1 px-1.5"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills (Keyboard Accessible) */}
        <div
          role="group"
          aria-label="Filter tools by category"
          className="flex flex-wrap items-center gap-2 pt-1"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(cat.id)}
                className={`focus-ring inline-flex items-center justify-center min-h-[44px] rounded-xl px-4 py-2 text-xs font-medium transition-all duration-200 select-none ${
                  isSelected
                    ? 'bg-accent text-accent-contrast shadow-sm font-semibold scale-100'
                    : 'glass-floating text-secondary hover:text-primary hover:bg-surface-muted/70'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tool Cards Grid or Empty State */}
      {filteredTools.length > 0 ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          role="region"
          aria-label="PDF tools directory"
        >
          {filteredTools.map((tool) => {
            const IconComponent = TOOL_ICONS[tool.iconName] || Layers;
            const categoryLabel = CATEGORY_LABELS[tool.category] || tool.category;

            return (
              <div
                key={tool.id}
                className="group focus-ring rounded-card outline-none"
              >
                <GlassCard
                  interactive
                  className="h-full flex flex-col justify-between p-6 sm:p-7 transition-all duration-200 group-hover:border-accent/50"
                >
                  <div>
                    {/* Top Row: Icon & Category Badge */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-accent-contrast shadow-xs">
                        <IconComponent className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <GlassBadge variant="neutral" size="sm" className="capitalize text-[10px]">
                        {categoryLabel}
                      </GlassBadge>
                    </div>

                    {/* Tool Name */}
                    <h2 className="font-heading text-lg font-bold text-primary group-hover:text-accent transition-colors duration-200">
                      {tool.name}
                    </h2>

                    {/* Tool Description */}
                    <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed line-clamp-2">
                      {tool.description}
                    </p>
                  </div>

                  {/* Card Navigation Action Link */}
                  <div className="mt-6 pt-4 border-t border-border-subtle/50">
                    <Link
                      to={tool.route}
                      className="focus-ring inline-flex items-center justify-between w-full text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                      aria-label={`Open ${tool.name}: ${tool.description}`}
                    >
                      <span>Open {tool.name}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty Results State */
        <GlassCard className="p-8 sm:p-12 text-center max-w-lg mx-auto border-dashed border-border-subtle my-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-muted mb-4">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </div>

          <h2 className="font-heading text-lg font-bold text-primary">
            No matching tools found
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-secondary leading-relaxed">
            {cleanQuery ? (
              <>
                No PDF tools matched <strong className="text-primary font-medium">"{searchQuery.trim()}"</strong>
                {selectedCategory !== 'all' ? ` in category "${CATEGORY_LABELS[selectedCategory] || selectedCategory}"` : ''}.
              </>
            ) : (
              <>No tools available in the selected category.</>
            )}
            {' '}Try searching with different keywords or clearing active filters.
          </p>

          <div className="mt-6">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
            >
              Clear filters
            </GlassButton>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
