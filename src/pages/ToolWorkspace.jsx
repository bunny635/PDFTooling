import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  Layers,
  Scissors,
  RotateCw,
  Trash2,
  ArrowUpDown,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Lock,
  Clock,
} from 'lucide-react';
import { getToolBySlug } from '../config/toolRegistry.js';
import { GlassCard, GlassBadge, GlassButton } from '../components/glass/index.js';
import {
  validateFileForTool,
  isDuplicateFile,
  formatFileSize,
} from '../utils/fileValidation.js';
import NotFound from './NotFound.jsx';

// Map iconName strings from toolRegistry.js to Lucide React components
const TOOL_ICONS = {
  Layers,
  Scissors,
  RotateCw,
  Trash2,
  ArrowUpDown,
  Image,
};

// Category display labels
const CATEGORY_LABELS = {
  organize: 'Organize',
  extract: 'Extract',
  edit: 'Edit',
  convert: 'Convert',
};

// Tool action button labels
const ACTION_LABELS = {
  'merge-pdf': 'Merge PDFs',
  'split-pdf': 'Split PDF',
  'rotate-pdf': 'Rotate PDF',
  'delete-pages': 'Delete Pages',
  'reorder-pages': 'Reorder Pages',
  'jpg-to-pdf': 'Convert to PDF',
};

/**
 * Inner workspace component containing the interactive file management state.
 * Isolated per activeSlug using React keying to ensure complete state reset across routes.
 */
function ToolWorkspaceInner({ tool }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const ToolIcon = TOOL_ICONS[tool.iconName] || FileText;
  const categoryLabel = CATEGORY_LABELS[tool.category] || tool.category;
  const actionLabel = ACTION_LABELS[tool.id] || tool.name;
  const isJpgTool = tool.id === 'jpg-to-pdf';
  const acceptedFormatsText = isJpgTool ? '.jpg, .jpeg' : '.pdf';
  const acceptedInputAttr = isJpgTool ? '.jpg,.jpeg,image/jpeg' : '.pdf,application/pdf';

  const totalSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  const handleFilesAdded = (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const newAlerts = [];
    const validNewFiles = [];

    for (const file of incomingFiles) {
      const validation = validateFileForTool(file, tool);
      if (!validation.valid) {
        newAlerts.push({
          id: `err-${file.name}-${Date.now()}-${Math.random()}`,
          type: 'error',
          message: validation.error,
        });
        continue;
      }

      if (
        isDuplicateFile(file, selectedFiles) ||
        isDuplicateFile(file, validNewFiles)
      ) {
        newAlerts.push({
          id: `dup-${file.name}-${Date.now()}-${Math.random()}`,
          type: 'warning',
          message: `"${file.name}" is already in your selected files list and was skipped.`,
        });
        continue;
      }

      validNewFiles.push(file);
    }

    if (tool.multiple) {
      // Multiple-file tool: append valid new files while preserving existing valid selections
      if (validNewFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validNewFiles]);
      }
    } else {
      // Single-file tool: replace active file or select first valid candidate
      if (validNewFiles.length > 0) {
        const chosenFile = validNewFiles[0];
        setSelectedFiles([chosenFile]);

        if (selectedFiles.length > 0) {
          newAlerts.push({
            id: `repl-${chosenFile.name}-${Date.now()}`,
            type: 'info',
            message: `Replaced previous file with "${chosenFile.name}". This tool operates on a single document at a time.`,
          });
        }
        if (validNewFiles.length > 1) {
          newAlerts.push({
            id: `single-warn-${Date.now()}`,
            type: 'warning',
            message: `Only the first valid file ("${chosenFile.name}") was loaded. This tool accepts a single PDF document.`,
          });
        }
      }
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...prev, ...newAlerts]);
    }

    // Always reset the input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  // Drag-and-drop handlers using counter to avoid flicker on nested child elements
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setAlerts([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  return (
    <div className="py-6 sm:py-8 max-w-4xl mx-auto">
      {/* Top Navigation & Category Pill */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/tools"
          aria-label="Back to All Tools"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-secondary hover:text-primary transition-colors focus-ring rounded-lg px-2 py-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>All Tools</span>
        </Link>
        <GlassBadge variant="accent" size="md">
          {categoryLabel}
        </GlassBadge>
      </div>

      {/* Tool Header Section */}
      <div className="glass-panel p-6 sm:p-10 text-center mb-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <ToolIcon className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-primary">
          {tool.name} Workspace
        </h1>
        <p className="mt-2 text-sm sm:text-base text-secondary max-w-xl mx-auto">
          {tool.description}
        </p>

        {/* Accurate Privacy Assurance Pill */}
        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-surface-muted/90 text-secondary border border-border-subtle shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5 text-status-success shrink-0" aria-hidden="true" />
          <span>Local In-Browser Workspace • Files Stay on Your Device (Zero Document Uploads)</span>
        </div>
      </div>

      {/* Accessible Notifications / Alert Area */}
      {alerts.length > 0 && (
        <div
          role="region"
          aria-live="polite"
          aria-label="Workspace notifications"
          className="mb-6 space-y-2.5"
        >
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                alert.type === 'error'
                  ? 'bg-status-danger/10 border-status-danger/30 text-status-danger'
                  : alert.type === 'warning'
                  ? 'bg-status-warning/10 border-status-warning/30 text-status-warning'
                  : 'bg-accent/10 border-accent/30 text-accent'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {alert.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>{alert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDismissAlert(alert.id)}
                aria-label="Dismiss alert"
                className="p-1 rounded-lg text-current opacity-70 hover:opacity-100 focus-ring min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drag-and-Drop Local File Selection Area */}
      <div
        role="region"
        aria-label={`${tool.name} file selection area`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`glass-dropzone p-8 sm:p-12 text-center transition-all ${
          isDragging ? 'is-dragging' : ''
        }`}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Upload className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className="font-heading text-base sm:text-lg font-bold text-primary">
          Choose {tool.multiple ? 'files' : 'a file'} or drag &amp; drop here
        </p>
        <p className="mt-1 text-xs sm:text-sm text-secondary">
          Supports {acceptedFormatsText} files up to local browser capacity.
        </p>

        {/* Native File Input (Screen reader accessible, triggered via button) */}
        <input
          ref={fileInputRef}
          id={`file-input-${tool.id}`}
          type="file"
          className="sr-only"
          accept={acceptedInputAttr}
          multiple={tool.multiple}
          onChange={handleInputChange}
          aria-label={`Select ${tool.multiple ? 'files' : 'file'} for ${tool.name}`}
        />

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <GlassButton
            type="button"
            variant="primary"
            size="md"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
          >
            Select {tool.multiple ? 'Files' : 'File'}
          </GlassButton>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="glass-pill px-2.5 py-0.5 text-[11px] font-medium text-secondary">
            {isJpgTool ? '.JPG / .JPEG Only' : '.PDF Only'}
          </span>
          <span className="glass-pill px-2.5 py-0.5 text-[11px] font-medium text-secondary">
            {tool.multiple ? 'Multiple Files Supported' : 'Single Document Tool'}
          </span>
          <span className="glass-pill px-2.5 py-0.5 text-[11px] font-medium text-status-success">
            Files Stay in RAM
          </span>
        </div>
      </div>

      {/* Selected Files List Section */}
      {selectedFiles.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="font-heading text-base sm:text-lg font-bold text-primary">
                Selected {selectedFiles.length === 1 ? 'File' : 'Files'}
              </h2>
              <GlassBadge variant="accent" size="sm">
                {selectedFiles.length}
              </GlassBadge>
              <GlassBadge variant="neutral" size="sm">
                {formatFileSize(totalSize)} Total
              </GlassBadge>
            </div>
            <GlassButton
              type="button"
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={handleClearAll}
              className="text-secondary hover:text-status-danger"
            >
              Clear All
            </GlassButton>
          </div>

          <div className="space-y-2.5">
            {selectedFiles.map((file, idx) => {
              const fileExt = (file.name.split('.').pop() || 'FILE').toUpperCase();
              return (
                <GlassCard
                  key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                      {isJpgTool ? (
                        <Image className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="font-heading font-medium text-sm text-primary truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-secondary mt-0.5">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="font-semibold">{fileExt}</span>
                      </div>
                    </div>
                  </div>

                  <GlassButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => handleRemoveFile(idx)}
                    aria-label={`Remove ${file.name}`}
                    className="min-h-[44px] min-w-[44px] text-secondary hover:text-status-danger p-2 shrink-0"
                  />
                </GlassCard>
              );
            })}
          </div>

          {tool.multiple && (
            <p className="mt-3 text-xs text-secondary text-center">
              Drag &amp; drop more files or click &quot;Select Files&quot; to append additional documents.
            </p>
          )}
        </div>
      )}

      {/* Action Dock / Processing Placeholder */}
      <div className="glass-panel p-6 sm:p-8 mt-8 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
              {tool.name} Processing
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              {selectedFiles.length === 0
                ? `Select ${tool.multiple ? 'files' : 'a file'} above to enable workspace processing.`
                : `${selectedFiles.length} ${
                    selectedFiles.length === 1 ? 'file' : 'files'
                  } loaded (${formatFileSize(totalSize)}). Ready for client-side processing.`}
            </p>
          </div>

          <GlassButton
            type="button"
            variant="primary"
            size="lg"
            disabled={true}
            icon={Lock}
            className="w-full sm:w-auto"
          >
            {actionLabel}
          </GlassButton>
        </div>

        {/* Explanatory Placeholder Notice (Zero Fake Progress/Downloads) */}
        <div className="surface-opaque mt-4 rounded-xl border border-border-subtle p-3.5 flex items-start gap-3 text-xs text-secondary">
          <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold text-primary">Processing Engine Placeholder: </span>
            The in-browser processing engine (PDF.js rendering and pdf-lib document manipulation) is scheduled for upcoming implementation. Your files remain exclusively in local browser memory and are never uploaded to any external server.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Top-level Tool Workspace page container.
 * Resolves tool metadata and uses key={activeSlug} to reset inner state upon route switching.
 */
export default function ToolWorkspace({ slugOverride }) {
  const { slug } = useParams();
  const activeSlug = slugOverride || slug;
  const tool = getToolBySlug(activeSlug);

  if (!tool) {
    return <NotFound />;
  }

  return <ToolWorkspaceInner key={activeSlug} tool={tool} />;
}
