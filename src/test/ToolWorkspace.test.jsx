import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, MemoryRouter } from 'react-router-dom';
import { routes } from '../app/router.jsx';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';
import ToolWorkspace from '../pages/ToolWorkspace.jsx';

function renderWorkspace(route = '/tools/merge-pdf') {
  const memoryRouter = createMemoryRouter(routes, {
    initialEntries: [route],
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  });

  return {
    user: userEvent.setup(),
    router: memoryRouter,
    ...render(
      <ThemeProvider>
        <RouterProvider router={memoryRouter} future={{ v7_startTransition: true }} />
      </ThemeProvider>
    ),
  };
}

describe('ToolWorkspace Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it.each([
    ['/tools/merge-pdf', 'Merge PDF Workspace', 'Organize', 'Merge PDFs'],
    ['/tools/split-pdf', 'Split PDF Workspace', 'Extract', 'Split PDF'],
    ['/tools/rotate-pdf', 'Rotate PDF Workspace', 'Organize', 'Rotate PDF'],
    ['/tools/delete-pages', 'Delete Pages Workspace', 'Edit', 'Delete Pages'],
    ['/tools/reorder-pages', 'Reorder Pages Workspace', 'Organize', 'Reorder Pages'],
    ['/tools/jpg-to-pdf', 'JPG to PDF Workspace', 'Convert', 'Convert to PDF'],
  ])('renders metadata, header, and action for %s', (route, expectedHeading, expectedCategory, expectedAction) => {
    renderWorkspace(route);

    expect(screen.getByRole('heading', { level: 1, name: expectedHeading })).toBeInTheDocument();
    expect(screen.getByText(expectedCategory)).toBeInTheDocument();
    expect(
      screen.getByText(/Local In-Browser Workspace • Files Stay on Your Device \(Zero Document Uploads\)/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: expectedAction })).toBeDisabled();
    expect(screen.getByRole('link', { name: /Back to All Tools/i })).toBeInTheDocument();
  });

  it('allows file selection via native file input and displays file card with metadata', async () => {
    const { user } = renderWorkspace('/tools/merge-pdf');

    const file = new File(['%PDF-1.4 sample document content'], 'annual-report.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000000,
    });

    const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
    await user.upload(fileInput, file);

    // Selected files list should appear
    expect(screen.getByRole('heading', { level: 2, name: /Selected File/i })).toBeInTheDocument();
    expect(screen.getByText('annual-report.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove annual-report.pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clear All/i })).toBeInTheDocument();
  });

  it('supports appending multiple files in multi-file tools (merge-pdf)', async () => {
    const { user } = renderWorkspace('/tools/merge-pdf');

    const fileA = new File(['content-a'], 'doc-a.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000001,
    });
    const fileB = new File(['content-b'], 'doc-b.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000002,
    });

    const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
    await user.upload(fileInput, fileA);
    expect(screen.getByText('doc-a.pdf')).toBeInTheDocument();

    await user.upload(fileInput, fileB);
    expect(screen.getByText('doc-a.pdf')).toBeInTheDocument();
    expect(screen.getByText('doc-b.pdf')).toBeInTheDocument();
    expect(screen.getByText('Selected Files')).toBeInTheDocument();
  });

  it('enforces single-file constraint on single-document tools (split-pdf)', async () => {
    const { user } = renderWorkspace('/tools/split-pdf');

    const file1 = new File(['first'], 'first.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000010,
    });
    const file2 = new File(['second'], 'second.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000020,
    });

    const fileInput = screen.getByLabelText(/Select file for Split PDF/i);
    await user.upload(fileInput, file1);
    expect(screen.getByText('first.pdf')).toBeInTheDocument();

    // Uploading second file replaces the first file
    await user.upload(fileInput, file2);
    expect(screen.queryByText('first.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('second.pdf')).toBeInTheDocument();
    expect(
      screen.getByText(/Replaced previous file with "second.pdf"/i)
    ).toBeInTheDocument();
  });

  it('rejects empty 0-byte files with an accessible error notification', async () => {
    const { user } = renderWorkspace('/tools/rotate-pdf');

    const emptyFile = new File([], 'corrupt-empty.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000030,
    });

    const fileInput = screen.getByLabelText(/Select file for Rotate PDF/i);
    await user.upload(fileInput, emptyFile);

    expect(
      screen.getByText(/File "corrupt-empty.pdf" is empty \(0 bytes\) and cannot be processed/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Selected File/i })).not.toBeInTheDocument();
  });

  it('rejects invalid file types for PDF tools and preserves existing valid files', async () => {
    const { user } = renderWorkspace('/tools/merge-pdf');

    const validPdf = new File(['valid'], 'valid.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000040,
    });
    const invalidText = new File(['not pdf'], 'notes.txt', {
      type: 'text/plain',
      lastModified: 1710000000050,
    });

    const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
    await user.upload(fileInput, validPdf);
    expect(screen.getByText('valid.pdf')).toBeInTheDocument();

    // Upload invalid file (simulating file drop or manual picker selection)
    fireEvent.change(fileInput, { target: { files: [invalidText] } });
    expect(screen.getByText(/File "notes.txt" is not a PDF/i)).toBeInTheDocument();
    // Valid file remains
    expect(screen.getByText('valid.pdf')).toBeInTheDocument();
  });

  it('rejects conflicting non-empty MIME types', async () => {
    const { user } = renderWorkspace('/tools/rotate-pdf');

    const conflictingFile = new File(['data'], 'fake.pdf', {
      type: 'image/png',
      lastModified: 1710000000060,
    });

    const fileInput = screen.getByLabelText(/Select file for Rotate PDF/i);
    await user.upload(fileInput, conflictingFile);

    expect(
      screen.getByText(/has a conflicting file type \(image\/png\) and cannot be accepted as a PDF/i)
    ).toBeInTheDocument();
  });

  it('detects duplicate files using name, size, type, and lastModified', async () => {
    const { user } = renderWorkspace('/tools/merge-pdf');

    const file = new File(['duplicate-bytes'], 'invoice.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000070,
    });

    const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
    await user.upload(fileInput, file);
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();

    // Upload the exact same file again
    await user.upload(fileInput, file);
    expect(
      screen.getByText(/"invoice.pdf" is already in your selected files list and was skipped/i)
    ).toBeInTheDocument();
  });

  it('allows removing individual files and clearing all files', async () => {
    const { user } = renderWorkspace('/tools/merge-pdf');

    const fileA = new File(['content-1'], 'first.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000080,
    });
    const fileB = new File(['content-2'], 'second.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000090,
    });

    const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
    await user.upload(fileInput, [fileA, fileB]);

    expect(screen.getByText('first.pdf')).toBeInTheDocument();
    expect(screen.getByText('second.pdf')).toBeInTheDocument();

    // Remove first.pdf
    const removeFirst = screen.getByRole('button', { name: /Remove first.pdf/i });
    await user.click(removeFirst);
    expect(screen.queryByText('first.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('second.pdf')).toBeInTheDocument();

    // Clear all
    const clearAll = screen.getByRole('button', { name: /Clear All/i });
    await user.click(clearAll);
    expect(screen.queryByText('second.pdf')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Selected Files/i })).not.toBeInTheDocument();
  });

  it('resets file input so the same file can be selected again after removal', async () => {
    const { user } = renderWorkspace('/tools/split-pdf');

    const file = new File(['sample'], 're-select.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000100,
    });

    const fileInput = screen.getByLabelText(/Select file for Split PDF/i);
    await user.upload(fileInput, file);
    expect(screen.getByText('re-select.pdf')).toBeInTheDocument();

    // Remove file
    await user.click(screen.getByRole('button', { name: /Remove re-select.pdf/i }));
    expect(screen.queryByText('re-select.pdf')).not.toBeInTheDocument();

    // Select again
    await user.upload(fileInput, file);
    expect(screen.getByText('re-select.pdf')).toBeInTheDocument();
  });

  it('handles drag and drop interactions with is-dragging class', () => {
    renderWorkspace('/tools/merge-pdf');

    const dropzone = screen.getByRole('region', { name: /Merge PDF file selection area/i });
    expect(dropzone).not.toHaveClass('is-dragging');

    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveClass('is-dragging');

    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass('is-dragging');

    const file = new File(['dragged content'], 'dragged.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000110,
    });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(dropzone).not.toHaveClass('is-dragging');
    expect(screen.getByText('dragged.pdf')).toBeInTheDocument();
  });

  it('keeps processing action button disabled and displays placeholder engine explanation', () => {
    renderWorkspace('/tools/delete-pages');

    const actionButton = screen.getByRole('button', { name: /Delete Pages/i });
    expect(actionButton).toBeDisabled();

    expect(
      screen.getByText(/Processing Engine Placeholder/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The in-browser processing engine .* is scheduled for upcoming implementation/i)
    ).toBeInTheDocument();
  });

  it('validates JPG files correctly for jpg-to-pdf workspace', async () => {
    const { user } = renderWorkspace('/tools/jpg-to-pdf');

    expect(screen.getByRole('heading', { level: 1, name: /JPG to PDF Workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/\.jpg, \.jpeg/i)).toBeInTheDocument();

    const validJpg = new File(['jpg-data'], 'photo.jpg', {
      type: 'image/jpeg',
      lastModified: 1710000000120,
    });

    const fileInput = screen.getByLabelText(/Select files for JPG to PDF/i);
    await user.upload(fileInput, validJpg);

    expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    expect(screen.getByText('JPG')).toBeInTheDocument();
  });

  it('resets files and state when navigating between different tool routes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ThemeProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ToolWorkspace slugOverride="merge-pdf" />
        </MemoryRouter>
      </ThemeProvider>
    );

    const file = new File(['content'], 'merge-doc.pdf', {
      type: 'application/pdf',
      lastModified: 1710000000130,
    });

    const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
    await user.upload(fileInput, file);
    expect(screen.getByText('merge-doc.pdf')).toBeInTheDocument();

    // Rerender with a different tool route (Split PDF)
    rerender(
      <ThemeProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ToolWorkspace slugOverride="split-pdf" />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Split PDF Workspace/i })).toBeInTheDocument();
    // The previously uploaded file in Merge PDF must be cleanly reset and unmounted
    expect(screen.queryByText('merge-doc.pdf')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: /Selected File/i })).not.toBeInTheDocument();
  });

  describe('WS-02 Processing Lifecycle & Infrastructure', () => {
    it('displays minimum file requirement advisory in action dock for merge-pdf', async () => {
      const { user } = renderWorkspace('/tools/merge-pdf');

      // Initially with 0 files
      expect(
        screen.getByText(/Select at least 2 files to enable merge pdfs\./i)
      ).toBeInTheDocument();

      // Upload 1 file
      const file1 = new File(['file-one'], 'one.pdf', { type: 'application/pdf', lastModified: 1710000000200 });
      await user.upload(screen.getByLabelText(/Select files for Merge PDF/i), file1);

      // Still requires 2 files
      expect(
        screen.getByText(/Select at least 2 files to enable merge pdfs\./i)
      ).toBeInTheDocument();

      // Upload second file
      const file2 = new File(['file-two'], 'two.pdf', { type: 'application/pdf', lastModified: 1710000000201 });
      await user.upload(screen.getByLabelText(/Select files for Merge PDF/i), file2);

      // Minimum satisfied: 2 files loaded, ready for processing, but processor unavailable in prod
      expect(
        screen.getByText(/2 files loaded .* Ready for client-side processing\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Merge PDFs/i })).toBeDisabled();
      expect(screen.getByText(/Processing Engine Placeholder/i)).toBeInTheDocument();
    });

    it('enables processing, locks controls, and displays download result with injected mock processor', async () => {
      const user = userEvent.setup();
      let resolveMock;
      const delayedPromise = new Promise((resolve) => {
        resolveMock = resolve;
      });

      const mockAdapter = {
        id: 'split-pdf',
        isAvailable: true,
        execute: vi.fn().mockImplementation(() => delayedPromise),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="split-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const file = new File(['source'], 'original.pdf', { type: 'application/pdf', lastModified: 1710000000210 });
      const fileInput = screen.getByLabelText(/Select file for Split PDF/i);
      await user.upload(fileInput, file);

      // Action button should now be enabled because processor is available and input is ready
      const processButton = screen.getByRole('button', { name: /Split PDF/i });
      expect(processButton).not.toBeDisabled();

      // Click to start processing
      await user.click(processButton);

      // Processing state active: button shows loading, controls are disabled
      expect(screen.getByText(/Processing document in your local browser sandbox/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select File/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Clear All/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Remove original.pdf/i })).toBeDisabled();

      // Resolve the processing
      const outputBlob = new Blob(['%PDF-1.4 merged result'], { type: 'application/pdf' });
      await act(async () => {
        resolveMock({
          blob: outputBlob,
          suggestedFilename: 'extracted-pages.pdf',
          mimeType: 'application/pdf',
        });
      });

      // Successful completion: Download banner appears
      expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      expect(screen.getAllByText(/extracted-pages\.pdf/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Download extracted-pages\.pdf/i })).toBeInTheDocument();

      // Clear all resets state and removes download card
      await user.click(screen.getByRole('button', { name: /Clear All/i }));
      expect(screen.queryByText(/Ready for Download/i)).not.toBeInTheDocument();
    });

    it('displays accessible error banner on processor failure and allows dismissal', async () => {
      const user = userEvent.setup();
      const mockAdapter = {
        id: 'rotate-pdf',
        isAvailable: true,
        execute: vi.fn().mockRejectedValue(new Error('Corrupt PDF trailer syntax.')),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="rotate-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const file = new File(['bad'], 'corrupt.pdf', { type: 'application/pdf', lastModified: 1710000000220 });
      await user.upload(screen.getByLabelText(/Select file for Rotate PDF/i), file);

      const actionButton = screen.getByRole('button', { name: /Rotate PDF/i });
      expect(actionButton).not.toBeDisabled();

      await user.click(actionButton);

      // Accessible error banner should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Processing Error')).toBeInTheDocument();
      expect(screen.getByText('Corrupt PDF trailer syntax.')).toBeInTheDocument();

      // Dismissing error clears the banner
      await user.click(screen.getByRole('button', { name: /Dismiss/i }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
