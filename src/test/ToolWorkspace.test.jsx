import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, MemoryRouter } from 'react-router-dom';
import { routes } from '../app/router.jsx';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';
import { PDFDocument } from 'pdf-lib';
import ToolWorkspace, { isFileDragEvent } from '../pages/ToolWorkspace.jsx';

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
    it('displays minimum file requirement advisory and activates merge-pdf when two files are loaded', async () => {
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
      expect(screen.getByRole('button', { name: /Merge PDFs/i })).toBeDisabled();
      // Ordering notice is displayed once files are present
      expect(
        screen.getByText(/PDFs will be merged in the order shown below\./i)
      ).toBeInTheDocument();

      // Upload second file
      const file2 = new File(['file-two'], 'two.pdf', { type: 'application/pdf', lastModified: 1710000000201 });
      await user.upload(screen.getByLabelText(/Select files for Merge PDF/i), file2);

      // Minimum satisfied and merge-pdf processor is available in production
      expect(
        screen.getByText(/2 files loaded .* Ready for client-side processing\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Merge PDFs/i })).not.toBeDisabled();
      expect(screen.getByText(/Local Sandbox Execution/i)).toBeInTheDocument();
    });

    it('keeps action button disabled and shows placeholder for unavailable tools even with valid input', async () => {
      const { user } = renderWorkspace('/tools/rotate-pdf');

      // Upload valid file to single-file tool (input satisfied)
      const file = new File(['content'], 'sample.pdf', { type: 'application/pdf', lastModified: 1710000000205 });
      await user.upload(screen.getByLabelText(/Select file for Rotate PDF/i), file);

      // Input requirements satisfied, but rotate-pdf processor is unavailable in prod
      expect(
        screen.getByText(/1 file loaded .* Ready for client-side processing\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rotate PDF/i })).toBeDisabled();
      expect(screen.getByText(/Processing Engine Placeholder/i)).toBeInTheDocument();
    });

    it('executes real production merge-pdf processor with genuine pdf-lib documents', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="merge-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Create two genuine programmatic PDF fixtures
      const doc1 = await PDFDocument.create();
      doc1.addPage([100, 100]);
      const bytes1 = await doc1.save();
      const file1 = new File([bytes1], 'alpha.pdf', { type: 'application/pdf', lastModified: 1710000001000 });

      const doc2 = await PDFDocument.create();
      doc2.addPage([200, 200]);
      doc2.addPage([210, 210]);
      const bytes2 = await doc2.save();
      const file2 = new File([bytes2], 'beta.pdf', { type: 'application/pdf', lastModified: 1710000002000 });

      const fileInput = screen.getByLabelText(/Select files for Merge PDF/i);
      await user.upload(fileInput, [file1, file2]);

      expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
      expect(screen.getByText('beta.pdf')).toBeInTheDocument();
      expect(screen.getByText(/PDFs will be merged in the order shown below\./i)).toBeInTheDocument();

      const mergeButton = screen.getByRole('button', { name: /Merge PDFs/i });
      expect(mergeButton).not.toBeDisabled();

      // Click real Merge action
      await user.click(mergeButton);

      // Wait for output card
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Download merged\.pdf/i })).toBeInTheDocument();
      expect(screen.getAllByText(/merged\.pdf/i).length).toBeGreaterThanOrEqual(1);

      // Removing a file invalidates the result and resets to idle/disabled
      const removeFirst = screen.getByRole('button', { name: /Remove alpha\.pdf/i });
      await user.click(removeFirst);

      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Merge PDFs/i })).toBeDisabled();
      expect(screen.getByText(/Select at least 2 files to enable merge pdfs\./i)).toBeInTheDocument();
    });

    it('executes real production split-pdf processor with genuine pdf-lib document and page selection', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="split-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Create a 4-page source PDF document
      const doc = await PDFDocument.create();
      doc.addPage([100, 100]); // page 1
      doc.addPage([110, 110]); // page 2
      doc.addPage([120, 120]); // page 3
      doc.addPage([130, 130]); // page 4
      const bytes = await doc.save();
      const file = new File([bytes], 'source-doc.pdf', { type: 'application/pdf', lastModified: 1710000003000 });

      const fileInput = screen.getByLabelText(/Select file for Split PDF/i);
      await user.upload(fileInput, file);

      expect(screen.getByText('source-doc.pdf')).toBeInTheDocument();

      // Wait for async page count inspection
      await waitFor(() => {
        expect(screen.getByText(/4 Pages Total/i)).toBeInTheDocument();
      });

      // Split button is disabled before page selection is entered
      const splitButton = screen.getByRole('button', { name: /Split PDF/i });
      expect(splitButton).toBeDisabled();
      expect(screen.getByText(/Enter the pages you want to extract above\./i)).toBeInTheDocument();

      const pageInput = screen.getByLabelText(/Pages to Extract/i);

      // Enter invalid page exceeding total
      await user.type(pageInput, '5');
      expect(splitButton).toBeDisabled();
      expect(screen.getByText(/exceeds total document pages/i)).toBeInTheDocument();

      // Clear and enter valid page range
      await user.clear(pageInput);
      await user.type(pageInput, '1, 3-4');

      expect(screen.getByText(/Selected 3 pages: 1, 3, 4/i)).toBeInTheDocument();
      expect(splitButton).not.toBeDisabled();

      // Click Split PDF
      await user.click(splitButton);

      // Wait for output card
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Download extracted-pages\.pdf/i })).toBeInTheDocument();

      // Modifying page selection invalidates the download result
      await user.type(pageInput, ', 2');
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });

    it('discards stale page count when replacing a file during asynchronous inspection', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="split-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Doc 1: 5 pages
      const doc1 = await PDFDocument.create();
      for (let i = 0; i < 5; i++) doc1.addPage([100, 100]);
      const file1 = new File([await doc1.save()], 'five-pages.pdf', { type: 'application/pdf', lastModified: 1710000000001 });

      // Doc 2: 2 pages
      const doc2 = await PDFDocument.create();
      for (let i = 0; i < 2; i++) doc2.addPage([100, 100]);
      const file2 = new File([await doc2.save()], 'two-pages.pdf', { type: 'application/pdf', lastModified: 1710000000002 });

      const fileInput = screen.getByLabelText(/Select file for Split PDF/i);

      // Rapidly upload file1 then file2
      await user.upload(fileInput, file1);
      await user.upload(fileInput, file2);

      // Verify second file replaces the first file
      expect(screen.getByText('two-pages.pdf')).toBeInTheDocument();
      expect(screen.queryByText('five-pages.pdf')).not.toBeInTheDocument();

      // Final settled page count must strictly be from file 2 (2 Pages Total)
      await waitFor(() => {
        expect(screen.getByText(/2 Pages Total/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/5 Pages Total/i)).not.toBeInTheDocument();
    });

    it('cancels asynchronous page inspection cleanly upon file removal', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="split-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'sample.pdf', { type: 'application/pdf', lastModified: 1710000000003 });

      const fileInput = screen.getByLabelText(/Select file for Split PDF/i);
      await user.upload(fileInput, file);

      expect(screen.getByText('sample.pdf')).toBeInTheDocument();

      // Immediately remove the file
      await user.click(screen.getByRole('button', { name: /Remove sample\.pdf/i }));

      // Workspace must cleanly return to idle state with no stale errors or badges
      expect(screen.queryByText('sample.pdf')).not.toBeInTheDocument();
      expect(screen.queryByText(/Pages Total/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Split PDF/i })).toBeDisabled();
    });

    it('unmounts during asynchronous page inspection without throwing or logging errors', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { unmount } = render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="split-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'unmount-test.pdf', { type: 'application/pdf', lastModified: 1710000000004 });

      const fileInput = screen.getByLabelText(/Select file for Split PDF/i);
      await user.upload(fileInput, file);

      // Unmount immediately while inspection is in-flight
      unmount();

      // Verify no React state update errors or unhandled rejections occurred
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('enables processing, locks controls, and displays download result with injected mock processor', async () => {
      const user = userEvent.setup();
      let resolveMock;
      const delayedPromise = new Promise((resolve) => {
        resolveMock = resolve;
      });

      const mockAdapter = {
        id: 'rotate-pdf',
        isAvailable: true,
        execute: vi.fn().mockImplementation(() => delayedPromise),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="rotate-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const file = new File(['source'], 'original.pdf', { type: 'application/pdf', lastModified: 1710000000210 });
      const fileInput = screen.getByLabelText(/Select file for Rotate PDF/i);
      await user.upload(fileInput, file);

      // Action button should now be enabled because processor is available and input is ready
      const processButton = screen.getByRole('button', { name: /Rotate PDF/i });
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
          suggestedFilename: 'rotated.pdf',
          mimeType: 'application/pdf',
        });
      });

      // Successful completion: Download banner appears
      expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      expect(screen.getAllByText(/rotated\.pdf/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Download rotated\.pdf/i })).toBeInTheDocument();

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

  describe('AUDIT-01-FIX Workspace Drop Safety', () => {
    describe('isFileDragEvent helper', () => {
      it('returns true when dataTransfer types contains Files', () => {
        expect(isFileDragEvent({ dataTransfer: { types: ['Files'] } })).toBe(true);
        expect(isFileDragEvent({ dataTransfer: { types: ['text/plain', 'Files'] } })).toBe(true);
      });

      it('returns true when dataTransfer files list is non-empty', () => {
        const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' });
        expect(isFileDragEvent({ dataTransfer: { files: [file], types: [] } })).toBe(true);
      });

      it('returns false for text-only drags, null events, or non-file drags', () => {
        expect(isFileDragEvent(null)).toBe(false);
        expect(isFileDragEvent({})).toBe(false);
        expect(isFileDragEvent({ dataTransfer: null })).toBe(false);
        expect(isFileDragEvent({ dataTransfer: { types: ['text/plain'] } })).toBe(false);
        expect(isFileDragEvent({ dataTransfer: { types: ['text/uri-list'] } })).toBe(false);
      });
    });

    it('prevents default on window dragover and drop for file drags and ignores non-file drags', () => {
      const { unmount } = renderWorkspace('/tools/merge-pdf');

      // 1. File dragover on window
      const fileDragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      Object.defineProperty(fileDragOverEvent, 'dataTransfer', {
        value: { types: ['Files'] },
      });
      window.dispatchEvent(fileDragOverEvent);
      expect(fileDragOverEvent.defaultPrevented).toBe(true);

      // 2. File drop outside dropzone (e.g. on window)
      const fileDropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(fileDropEvent, 'dataTransfer', {
        value: {
          types: ['Files'],
          files: [new File(['content'], 'outside.pdf', { type: 'application/pdf' })],
        },
      });
      window.dispatchEvent(fileDropEvent);
      expect(fileDropEvent.defaultPrevented).toBe(true);

      // Verify file was NOT added to the workspace
      expect(screen.queryByText('outside.pdf')).not.toBeInTheDocument();

      // 3. Non-file drag (e.g. plain text drag) should NOT be prevented
      const textDragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      Object.defineProperty(textDragOverEvent, 'dataTransfer', {
        value: { types: ['text/plain'] },
      });
      window.dispatchEvent(textDragOverEvent);
      expect(textDragOverEvent.defaultPrevented).toBe(false);

      const textDropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(textDropEvent, 'dataTransfer', {
        value: { types: ['text/plain'] },
      });
      window.dispatchEvent(textDropEvent);
      expect(textDropEvent.defaultPrevented).toBe(false);

      // 4. Clean unmount removes window listeners
      unmount();
      const postUnmountDrop = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(postUnmountDrop, 'dataTransfer', {
        value: { types: ['Files'] },
      });
      window.dispatchEvent(postUnmountDrop);
      expect(postUnmountDrop.defaultPrevented).toBe(false);
    });

    it('preserves inside-dropzone file handling while window trap is active', () => {
      renderWorkspace('/tools/merge-pdf');

      const dropzone = screen.getByRole('region', { name: /Merge PDF file selection area/i });
      const insideFile = new File(['valid pdf content'], 'inside-drop.pdf', {
        type: 'application/pdf',
        lastModified: 1710000000999,
      });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [insideFile],
          types: ['Files'],
        },
      });

      // Inside drop must be processed and displayed in workspace
      expect(screen.getByText('inside-drop.pdf')).toBeInTheDocument();
      expect(screen.getByText('Selected File')).toBeInTheDocument();
    });
  });
});
