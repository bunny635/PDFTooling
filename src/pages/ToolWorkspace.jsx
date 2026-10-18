import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  Download,
} from 'lucide-react';
import { getToolBySlug } from '../config/toolRegistry.js';
import { GlassCard, GlassBadge, GlassButton, GlassInput } from '../components/glass/index.js';
import {
  validateFileForTool,
  isDuplicateFile,
  formatFileSize,
} from '../utils/fileValidation.js';
import { parsePageRange } from '../utils/pageSelection.js';
import { useToolProcessor } from '../hooks/useToolProcessor.js';
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
 * Detects whether a drag or drop event involves actual filesystem files.
 * Ensures the global drag trap ignores text selection, link dragging, and internal UI drags.
 */
export function isFileDragEvent(e) {
  if (!e || !e.dataTransfer) return false;
  const types = e.dataTransfer.types;
  if (!types) {
    return Boolean(e.dataTransfer.files && e.dataTransfer.files.length > 0);
  }
  const hasFilesType =
    (typeof types.includes === 'function' && types.includes('Files')) ||
    Array.from(types).includes('Files');
  const hasFilesList = Boolean(e.dataTransfer.files && e.dataTransfer.files.length > 0);
  return Boolean(hasFilesType || hasFilesList);
}

/**
 * Inner workspace component containing the interactive file management state
 * and processing lifecycle. Isolated per activeSlug using React keying.
 */
function ToolWorkspaceInner({ tool, processorAdapterOverride }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Page-level and single-file tool specific states (Split, Rotate)
  const [pageSelection, setPageSelection] = useState('');
  const [sourcePageCount, setSourcePageCount] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionError, setInspectionError] = useState(null);

  // Rotate PDF specific options
  const [rotationAngle, setRotationAngle] = useState(90);
  const [rotationScope, setRotationScope] = useState('all');

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const inspectionTokenRef = useRef(0);
  const inspectionAbortRef = useRef(null);

  const isSplitTool = tool.id === 'split-pdf';
  const isRotateTool = tool.id === 'rotate-pdf';
  const isDeleteTool = tool.id === 'delete-pages';
  const needsPageInspection = isSplitTool || isRotateTool || isDeleteTool;

  // Prevent browser default navigation when files are accidentally dropped outside the dropzone
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      if (isFileDragEvent(e)) {
        e.preventDefault();
      }
    };

    const handleWindowDrop = (e) => {
      if (isFileDragEvent(e)) {
        e.preventDefault();
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  // Inspect page count asynchronously for single-file PDF tools (Split, Rotate, Delete) without eager bundle bloat
  useEffect(() => {
    if (!needsPageInspection) return;

    inspectionTokenRef.current += 1;
    const currentToken = inspectionTokenRef.current;
    if (inspectionAbortRef.current) {
      inspectionAbortRef.current.abort();
      inspectionAbortRef.current = null;
    }

    if (selectedFiles.length !== 1) {
      setSourcePageCount(null);
      setIsInspecting(false);
      setInspectionError(null);
      return;
    }

    const targetFile = selectedFiles[0];
    const controller = new AbortController();
    inspectionAbortRef.current = controller;
    setIsInspecting(true);
    setInspectionError(null);
    setSourcePageCount(null);

    let isMounted = true;

    (async () => {
      try {
        const { getPdfPageCount } = await import('../processors/splitPdf.js');
        const count = await getPdfPageCount(targetFile, controller.signal);
        if (isMounted && inspectionTokenRef.current === currentToken) {
          setSourcePageCount(count);
          setIsInspecting(false);
        }
      } catch (err) {
        if (isMounted && inspectionTokenRef.current === currentToken && !controller.signal.aborted) {
          setIsInspecting(false);
          setInspectionError(err?.message || 'Failed to inspect PDF pages.');
        }
      }
    })();

    return () => {
      isMounted = false;
      inspectionTokenRef.current += 1;
      controller.abort();
    };
  }, [needsPageInspection, selectedFiles]);

  // Validate human-entered page selection against inspected page count for Split and Rotate
  const rangeResult = useMemo(() => {
    if ((!isSplitTool && (!isRotateTool || rotationScope !== 'selected')) || sourcePageCount === null) {
      return null;
    }
    return parsePageRange(pageSelection, sourcePageCount);
  }, [isSplitTool, isRotateTool, rotationScope, pageSelection, sourcePageCount]);

  // Validate human-entered page selection for Delete Pages (ensuring not all pages are deleted)
  const deleteResult = useMemo(() => {
    if (!isDeleteTool || sourcePageCount === null) {
      return null;
    }
    const parse = parsePageRange(pageSelection, sourcePageCount);
    if (!parse.valid) {
      return {
        valid: false,
        error: parse.error,
      };
    }
    const deleteCount = parse.pageIndices.length;
    if (deleteCount >= sourcePageCount) {
      return {
        valid: false,
        error: 'Cannot delete all pages from the document. At least one page must remain.',
      };
    }
    const retainCount = sourcePageCount - deleteCount;
    const deletedList = parse.pageIndices.map((i) => i + 1).join(', ');
    return {
      valid: true,
      deleteCount,
      retainCount,
      deletedList,
      pageIndices: parse.pageIndices,
    };
  }, [isDeleteTool, pageSelection, sourcePageCount]);

  const isOptionsValid = useMemo(() => {
    if (isSplitTool) {
      return Boolean(sourcePageCount !== null && rangeResult?.valid);
    }
    if (isRotateTool) {
      const isAngleValid = [90, 180, 270].includes(rotationAngle);
      if (!isAngleValid || sourcePageCount === null) return false;
      if (rotationScope === 'all') return true;
      return Boolean(rangeResult?.valid);
    }
    if (isDeleteTool) {
      return Boolean(sourcePageCount !== null && deleteResult?.valid);
    }
    return true;
  }, [isSplitTool, isRotateTool, isDeleteTool, sourcePageCount, rangeResult, rotationAngle, rotationScope, deleteResult]);

  // When scope is All pages for Rotate, exclude the inactive page-selection value from effective processing options
  // so that hidden input changes do not unnecessarily invalidate results.
  const processorOptions = useMemo(() => {
    if (isSplitTool || isDeleteTool) {
      return { pageSelection };
    }
    if (isRotateTool) {
      return {
        angle: rotationAngle,
        scope: rotationScope,
        ...(rotationScope === 'selected' ? { pageSelection } : {}),
      };
    }
    return undefined;
  }, [isSplitTool, isRotateTool, isDeleteTool, pageSelection, rotationAngle, rotationScope]);

  // Hook managing processing lifecycle (idle, ready, processing, success, error)
  const {
    status,
    isProcessing,
    hasRequiredInputs,
    isProcessorAvailable,
    canProcess,
    result,
    error: processingError,
    minFiles,
    executeProcessing,
    downloadResult,
    resetProcessing,
  } = useToolProcessor({
    tool,
    files: selectedFiles,
    options: processorOptions,
    isOptionsValid,
    processorAdapter: processorAdapterOverride,
  });

  const ToolIcon = TOOL_ICONS[tool.iconName] || FileText;
  const categoryLabel = CATEGORY_LABELS[tool.category] || tool.category;
  const actionLabel = ACTION_LABELS[tool.id] || tool.name;
  const isJpgTool = tool.id === 'jpg-to-pdf';
  const acceptedFormatsText = isJpgTool ? '.jpg, .jpeg' : '.pdf';
  const acceptedInputAttr = isJpgTool ? '.jpg,.jpeg,image/jpeg' : '.pdf,application/pdf';

  const totalSize = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  const handleFilesAdded = (incomingFiles) => {
    if (isProcessing) return;
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

        if (needsPageInspection) {
          setPageSelection('');
          setInspectionError(null);
          if (isRotateTool) {
            setRotationAngle(90);
            setRotationScope('all');
          }
        }

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
    if (isProcessing) return;
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
    }
  };

  // Drag-and-drop handlers using counter to avoid flicker on nested child elements
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
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
    if (isProcessing) return;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    if (isProcessing) return;
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (needsPageInspection) {
      setPageSelection('');
      setSourcePageCount(null);
      setInspectionError(null);
      if (isRotateTool) {
        setRotationAngle(90);
        setRotationScope('all');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    if (isProcessing) return;
    setSelectedFiles([]);
    setAlerts([]);
    if (needsPageInspection) {
      setPageSelection('');
      setSourcePageCount(null);
      setInspectionError(null);
      if (isRotateTool) {
        setRotationAngle(90);
        setRotationScope('all');
      }
    }
    resetProcessing();
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

      {/* Accessible Notifications / Input Alert Area */}
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

      {/* Processing Error Banner */}
      {processingError && status === 'error' && (
        <div
          role="alert"
          aria-live="assertive"
          className="glass-panel p-4 mb-6 border border-status-danger/40 bg-status-danger/10 rounded-xl flex items-start justify-between gap-3 text-status-danger text-xs sm:text-sm"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold">Processing Error</p>
              <p className="mt-0.5 opacity-90">{processingError}</p>
            </div>
          </div>
          <GlassButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetProcessing}
            className="text-status-danger hover:bg-status-danger/20 shrink-0"
          >
            Dismiss
          </GlassButton>
        </div>
      )}

      {/* Processing In-Flight Status Announcement */}
      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="glass-panel p-4 mb-6 border border-accent/30 bg-accent/10 rounded-xl flex items-center gap-3 text-accent text-xs sm:text-sm font-semibold"
        >
          <div className="h-4 w-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
          <span>Processing document in your local browser sandbox...</span>
        </div>
      )}

      {/* Successful Output & Download Banner */}
      {result && status === 'success' && (
        <div className="glass-panel p-5 sm:p-6 mb-8 border border-status-success/30 bg-status-success/5 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-status-success/15 flex items-center justify-center text-status-success shrink-0">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading font-bold text-sm sm:text-base text-primary">
                  Ready for Download
                </h2>
                <p className="text-xs text-secondary mt-0.5 truncate">
                  {result.filename} • {formatFileSize(result.blob.size)}
                </p>
              </div>
            </div>

            <GlassButton
              type="button"
              variant="primary"
              size="md"
              icon={Download}
              onClick={downloadResult}
              className="w-full sm:w-auto"
            >
              Download {result.filename}
            </GlassButton>
          </div>
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
        } ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
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
          disabled={isProcessing}
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
            disabled={isProcessing}
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
              disabled={isProcessing}
              onClick={handleClearAll}
              className="text-secondary hover:text-status-danger"
            >
              Clear All
            </GlassButton>
          </div>

          {/* Merge PDF File Ordering Notice */}
          {tool.id === 'merge-pdf' && (
            <p className="text-xs text-secondary mb-3.5 flex items-center gap-1.5 font-medium">
              <Info className="h-3.5 w-3.5 text-accent shrink-0" aria-hidden="true" />
              <span>PDFs will be merged in the order shown below.</span>
            </p>
          )}

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
                    disabled={isProcessing}
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

      {/* Split PDF Page Selection Configuration */}
      {isSplitTool && selectedFiles.length === 1 && (
        <div className="glass-panel p-5 sm:p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
                Select Pages to Extract
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Specify page numbers or ranges to extract in original document order.
              </p>
            </div>
            {isInspecting ? (
              <span className="glass-pill px-3 py-1 text-xs text-accent flex items-center gap-1.5 self-start sm:self-auto">
                <span className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                Inspecting pages...
              </span>
            ) : sourcePageCount !== null ? (
              <GlassBadge variant="accent" size="md" className="self-start sm:self-auto">
                {sourcePageCount} {sourcePageCount === 1 ? 'Page' : 'Pages'} Total
              </GlassBadge>
            ) : null}
          </div>

          {inspectionError ? (
            <div className="p-3.5 rounded-xl border border-status-danger/30 bg-status-danger/10 text-status-danger text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{inspectionError}</span>
            </div>
          ) : (
            <GlassInput
              id="split-page-selection"
              label="Pages to Extract"
              placeholder="e.g. 1-3, 5, 8-10"
              value={pageSelection}
              disabled={isProcessing || isInspecting || sourcePageCount === null}
              onChange={(e) => setPageSelection(e.target.value)}
              helperText={
                rangeResult?.valid
                  ? `Selected ${rangeResult.pageIndices.length} ${
                      rangeResult.pageIndices.length === 1 ? 'page' : 'pages'
                    }: ${rangeResult.pageIndices.map((i) => i + 1).join(', ')}`
                  : 'Enter page numbers and/or ranges (e.g. 1-3, 5, 8-10).'
              }
              error={
                pageSelection.trim().length > 0 && !rangeResult?.valid
                  ? rangeResult?.error
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* Rotate PDF Configuration */}
      {isRotateTool && selectedFiles.length === 1 && (
        <div className="glass-panel p-5 sm:p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
                Rotate Options
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Choose rotation angle and specify target pages.
              </p>
            </div>
            {isInspecting ? (
              <span className="glass-pill px-3 py-1 text-xs text-accent flex items-center gap-1.5 self-start sm:self-auto">
                <span className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                Inspecting pages...
              </span>
            ) : sourcePageCount !== null ? (
              <GlassBadge variant="accent" size="md" className="self-start sm:self-auto">
                {sourcePageCount} {sourcePageCount === 1 ? 'Page' : 'Pages'} Total
              </GlassBadge>
            ) : null}
          </div>

          {inspectionError ? (
            <div className="p-3.5 rounded-xl border border-status-danger/30 bg-status-danger/10 text-status-danger text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{inspectionError}</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Angle Selector */}
              <div>
                <label className="mb-2 block font-heading text-xs font-semibold text-primary">
                  Rotation Angle
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { angle: 90, label: '90° Clockwise' },
                    { angle: 180, label: '180° Flip' },
                    { angle: 270, label: '270° Clockwise' },
                  ].map(({ angle, label }) => {
                    const isSelected = rotationAngle === angle;
                    return (
                      <button
                        key={angle}
                        type="button"
                        disabled={isProcessing || isInspecting || sourcePageCount === null}
                        onClick={() => setRotationAngle(angle)}
                        aria-pressed={isSelected}
                        aria-label={`Rotate ${label}`}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus-ring ${
                          isSelected
                            ? 'bg-accent text-accent-contrast shadow-sm ring-1 ring-accent'
                            : 'surface-glass text-secondary hover:text-primary hover:bg-surface-hover/80 border border-border-subtle'
                        } ${isProcessing || isInspecting || sourcePageCount === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <RotateCw
                          className={`h-3.5 w-3.5 ${
                            angle === 180 ? 'rotate-90' : angle === 270 ? 'rotate-180' : ''
                          }`}
                          aria-hidden="true"
                        />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scope Selector */}
              <div>
                <label className="mb-2 block font-heading text-xs font-semibold text-primary">
                  Rotation Scope
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { scope: 'all', label: 'All Pages' },
                    { scope: 'selected', label: 'Selected Pages' },
                  ].map(({ scope, label }) => {
                    const isSelected = rotationScope === scope;
                    return (
                      <button
                        key={scope}
                        type="button"
                        disabled={isProcessing || isInspecting || sourcePageCount === null}
                        onClick={() => setRotationScope(scope)}
                        aria-pressed={isSelected}
                        className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all focus-ring ${
                          isSelected
                            ? 'bg-accent text-accent-contrast shadow-sm ring-1 ring-accent'
                            : 'surface-glass text-secondary hover:text-primary hover:bg-surface-hover/80 border border-border-subtle'
                        } ${isProcessing || isInspecting || sourcePageCount === null ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Page Selection Input for Selected Pages Scope */}
              {rotationScope === 'selected' && (
                <div>
                  <GlassInput
                    id="rotate-page-selection"
                    label="Pages to Rotate"
                    placeholder="e.g. 1-3, 5, 8-10"
                    value={pageSelection}
                    disabled={isProcessing || isInspecting || sourcePageCount === null}
                    onChange={(e) => setPageSelection(e.target.value)}
                    helperText={
                      rangeResult?.valid
                        ? `Selected ${rangeResult.pageIndices.length} ${
                            rangeResult.pageIndices.length === 1 ? 'page' : 'pages'
                          }: ${rangeResult.pageIndices.map((i) => i + 1).join(', ')}`
                        : 'Enter page numbers and/or ranges to rotate (e.g. 1-3, 5, 8-10).'
                    }
                    error={
                      pageSelection.trim().length > 0 && !rangeResult?.valid
                        ? rangeResult?.error
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete PDF Pages Configuration */}
      {isDeleteTool && selectedFiles.length === 1 && (
        <div className="glass-panel p-5 sm:p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
                Select Pages to Delete
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Specify page numbers or ranges to remove from the document.
              </p>
            </div>
            {isInspecting ? (
              <span className="glass-pill px-3 py-1 text-xs text-accent flex items-center gap-1.5 self-start sm:self-auto">
                <span className="h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                Inspecting pages...
              </span>
            ) : sourcePageCount !== null ? (
              <GlassBadge variant="accent" size="md" className="self-start sm:self-auto">
                {sourcePageCount} {sourcePageCount === 1 ? 'Page' : 'Pages'} Total
              </GlassBadge>
            ) : null}
          </div>

          {inspectionError ? (
            <div className="p-3.5 rounded-xl border border-status-danger/30 bg-status-danger/10 text-status-danger text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{inspectionError}</span>
            </div>
          ) : (
            <GlassInput
              id="delete-page-selection"
              label="Pages to Delete"
              placeholder="e.g. 1-3, 5, 8-10"
              value={pageSelection}
              disabled={isProcessing || isInspecting || sourcePageCount === null}
              onChange={(e) => setPageSelection(e.target.value)}
              helperText={
                deleteResult?.valid
                  ? `Deleting ${deleteResult.deleteCount} ${
                      deleteResult.deleteCount === 1 ? 'page' : 'pages'
                    } (${deleteResult.deletedList}). Retaining ${deleteResult.retainCount} ${
                      deleteResult.retainCount === 1 ? 'page' : 'pages'
                    }.`
                  : 'Enter page numbers and/or ranges to remove (e.g. 1-3, 5, 8-10).'
              }
              error={
                pageSelection.trim().length > 0 && !deleteResult?.valid
                  ? deleteResult?.error
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* Action Dock / Processing Section */}
      <div className="glass-panel p-6 sm:p-8 mt-8 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-sm sm:text-base font-bold text-primary">
              {tool.name} Processing
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              {!hasRequiredInputs
                ? minFiles > 1
                  ? `Select at least ${minFiles} files to enable ${actionLabel.toLowerCase()}.`
                  : `Select a file above to enable workspace processing.`
                : isProcessing
                ? `Processing ${selectedFiles.length} ${
                    selectedFiles.length === 1 ? 'file' : 'files'
                  } in local browser sandbox...`
                : isSplitTool
                ? isInspecting
                  ? 'Inspecting document pages in local sandbox...'
                  : inspectionError
                  ? 'Cannot process: source document has inspection errors.'
                  : !pageSelection.trim()
                  ? 'Enter the pages you want to extract above.'
                  : !rangeResult?.valid
                  ? 'Please correct the page selection above.'
                  : `Extracting ${rangeResult.pageIndices.length} ${
                      rangeResult.pageIndices.length === 1 ? 'page' : 'pages'
                    } in document order. Ready for client-side processing.`
                : isRotateTool
                ? isInspecting
                  ? 'Inspecting document pages in local sandbox...'
                  : inspectionError
                  ? 'Cannot process: source document has inspection errors.'
                  : rotationScope === 'selected' && !pageSelection.trim()
                  ? 'Enter the pages you want to rotate above.'
                  : rotationScope === 'selected' && !rangeResult?.valid
                  ? 'Please correct the page selection above.'
                  : rotationScope === 'all'
                  ? `Rotating all ${sourcePageCount || ''} pages by ${rotationAngle}° clockwise. Ready for client-side processing.`
                  : `Rotating ${rangeResult?.pageIndices?.length || 0} selected pages by ${rotationAngle}° clockwise. Ready for client-side processing.`
                : isDeleteTool
                ? isInspecting
                  ? 'Inspecting document pages in local sandbox...'
                  : inspectionError
                  ? 'Cannot process: source document has inspection errors.'
                  : !pageSelection.trim()
                  ? 'Enter the pages you want to delete above.'
                  : !deleteResult?.valid
                  ? 'Please correct the page selection above.'
                  : `Deleting ${deleteResult.deleteCount} ${
                      deleteResult.deleteCount === 1 ? 'page' : 'pages'
                    }. Retaining ${deleteResult.retainCount} ${
                      deleteResult.retainCount === 1 ? 'page' : 'pages'
                    }. Ready for client-side processing.`
                : `${selectedFiles.length} ${
                    selectedFiles.length === 1 ? 'file' : 'files'
                  } loaded (${formatFileSize(totalSize)}). Ready for client-side processing.`}
            </p>
          </div>

          <GlassButton
            type="button"
            variant="primary"
            size="lg"
            isLoading={isProcessing}
            disabled={!canProcess}
            icon={!isProcessorAvailable ? Lock : undefined}
            onClick={executeProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? 'Processing...' : actionLabel}
          </GlassButton>
        </div>

        {/* Dynamic Sandbox or Implementation Notice */}
        {!isProcessorAvailable ? (
          <div className="surface-opaque mt-4 rounded-xl border border-border-subtle p-3.5 flex items-start gap-3 text-xs text-secondary">
            <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-primary">Processing Engine Placeholder: </span>
              The in-browser processing engine (PDF.js rendering and pdf-lib document manipulation) is scheduled for upcoming implementation. Your files remain exclusively in local browser memory and are never uploaded to any external server.
            </div>
          </div>
        ) : (
          <div className="surface-opaque mt-4 rounded-xl border border-border-subtle p-3.5 flex items-start gap-3 text-xs text-secondary">
            <ShieldCheck className="h-4 w-4 text-status-success shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-primary">Local Sandbox Execution: </span>
              Processing executes exclusively inside your local browser memory sandbox. No document data or metadata is ever transmitted across the network.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Top-level Tool Workspace page container.
 * Resolves tool metadata and uses key={activeSlug} to reset inner state upon route switching.
 * Accepts processorAdapterOverride for test-only dependency injection.
 */
export default function ToolWorkspace({ slugOverride, processorAdapterOverride }) {
  const { slug } = useParams();
  const activeSlug = slugOverride || slug;
  const tool = getToolBySlug(activeSlug);

  if (!tool) {
    return <NotFound />;
  }

  return (
    <ToolWorkspaceInner
      key={activeSlug}
      tool={tool}
      processorAdapterOverride={processorAdapterOverride}
    />
  );
}
