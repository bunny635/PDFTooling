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

  it('keeps processing action button disabled and displays placeholder engine explanation when processor is unavailable', () => {
    const unavailableAdapter = {
      id: 'jpg-to-pdf',
      isAvailable: false,
      status: 'unavailable',
      execute: null,
    };
    render(
      <ThemeProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ToolWorkspace slugOverride="jpg-to-pdf" processorAdapterOverride={unavailableAdapter} />
        </MemoryRouter>
      </ThemeProvider>
    );

    const actionButton = screen.getByRole('button', { name: /Convert to PDF/i });
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
      const user = userEvent.setup();
      const unavailableAdapter = {
        id: 'jpg-to-pdf',
        isAvailable: false,
        status: 'unavailable',
        execute: null,
      };
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" processorAdapterOverride={unavailableAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      // Upload valid file to single-file tool (input satisfied)
      const file = new File(['content'], 'sample.jpg', { type: 'image/jpeg', lastModified: 1710000000205 });
      await user.upload(screen.getByLabelText(/Select files for JPG to PDF/i), file);

      // Input requirements satisfied, but processor is unavailable
      expect(
        screen.getByText(/Ready for client-side processing\./i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Convert to PDF/i })).toBeDisabled();
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
        id: 'jpg-to-pdf',
        isAvailable: true,
        execute: vi.fn().mockImplementation(() => delayedPromise),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const file = new File(['source'], 'original.jpg', { type: 'image/jpeg', lastModified: 1710000000210 });
      const fileInput = screen.getByLabelText(/Select files for JPG to PDF/i);
      await user.upload(fileInput, file);

      // Action button should now be enabled because processor is available and input is ready
      const processButton = screen.getByRole('button', { name: /Convert to PDF/i });
      expect(processButton).not.toBeDisabled();

      // Click to start processing
      await user.click(processButton);

      // Processing state active: button shows loading, controls are disabled
      expect(screen.getByText(/Processing document in your local browser sandbox/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select Files/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Clear All/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Remove original.jpg/i })).toBeDisabled();

      // Resolve the processing
      const outputBlob = new Blob(['%PDF-1.4 converted result'], { type: 'application/pdf' });
      await act(async () => {
        resolveMock({
          blob: outputBlob,
          suggestedFilename: 'converted.pdf',
          mimeType: 'application/pdf',
        });
      });

      // Successful completion: Download banner appears
      expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      expect(screen.getAllByText(/converted\.pdf/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Download converted\.pdf/i })).toBeInTheDocument();

      // Clear all resets state and removes download card
      await user.click(screen.getByRole('button', { name: /Clear All/i }));
      expect(screen.queryByText(/Ready for Download/i)).not.toBeInTheDocument();
    });

    it('displays accessible error banner on processor failure and allows dismissal', async () => {
      const user = userEvent.setup();
      const mockAdapter = {
        id: 'jpg-to-pdf',
        isAvailable: true,
        execute: vi.fn().mockRejectedValue(new Error('Corrupt JPG image stream.')),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const file = new File(['bad'], 'corrupt.jpg', { type: 'image/jpeg', lastModified: 1710000000220 });
      await user.upload(screen.getByLabelText(/Select files for JPG to PDF/i), file);

      const actionButton = screen.getByRole('button', { name: /Convert to PDF/i });
      expect(actionButton).not.toBeDisabled();

      await user.click(actionButton);

      // Accessible error banner should be displayed
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Processing Error')).toBeInTheDocument();
      expect(screen.getByText('Corrupt JPG image stream.')).toBeInTheDocument();

      // Dismissing error clears the banner
      await user.click(screen.getByRole('button', { name: /Dismiss/i }));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('PDF-03 Rotate PDF Workspace Integration', () => {
    it('renders rotation controls and defaults to 90 degrees and all pages', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="rotate-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'one-page.pdf', { type: 'application/pdf', lastModified: 1710000000300 });

      await user.upload(screen.getByLabelText(/Select file for Rotate PDF/i), file);
      await waitFor(() => {
        expect(screen.getByText(/1 Page Total/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 3, name: /Rotate Options/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Rotate 90° Clockwise/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /Rotate 180° Flip/i })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /Rotate 270° Clockwise/i })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: /All Pages/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /Selected Pages/i })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByLabelText(/Pages to Rotate/i)).not.toBeInTheDocument();
    });

    it('inspects page count, rotates all pages by 90 degrees, and allows download', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="rotate-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([200, 200]);
      doc.addPage([200, 200]);
      doc.addPage([200, 200]);
      const pdfBytes = await doc.save();
      const file = new File([pdfBytes], 'three-pages.pdf', { type: 'application/pdf', lastModified: 1710000000300 });

      const fileInput = screen.getByLabelText(/Select file for Rotate PDF/i);
      await user.upload(fileInput, file);

      // Verify page count inspection
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      const rotateButton = screen.getByRole('button', { name: /Rotate PDF/i });
      expect(rotateButton).not.toBeDisabled();

      // Trigger rotate
      await user.click(rotateButton);

      // Verify download card
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Download rotated\.pdf/i })).toBeInTheDocument();
    });

    it('rotates selected pages and updates page selection badge', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="rotate-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([200, 200]);
      doc.addPage([200, 200]);
      doc.addPage([200, 200]);
      const file = new File([await doc.save()], 'select-rotate.pdf', { type: 'application/pdf', lastModified: 1710000000301 });

      await user.upload(screen.getByLabelText(/Select file for Rotate PDF/i), file);
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      // Switch to selected pages
      const selectedScopeBtn = screen.getByRole('button', { name: /Selected Pages/i });
      await user.click(selectedScopeBtn);
      expect(selectedScopeBtn).toHaveAttribute('aria-pressed', 'true');

      // Now the page range input appears
      const rangeInput = screen.getByLabelText(/Pages to Rotate/i);
      expect(rangeInput).toBeInTheDocument();

      // Action button should be disabled because range input is empty
      const rotateButton = screen.getByRole('button', { name: /Rotate PDF/i });
      expect(rotateButton).toBeDisabled();

      // Type page 2
      await user.type(rangeInput, '2');
      expect(screen.getByText(/Selected 1 page: 2/i)).toBeInTheDocument();
      expect(rotateButton).not.toBeDisabled();

      // Click 180 degrees
      await user.click(screen.getByRole('button', { name: /Rotate 180° Flip/i }));

      // Execute rotation
      await user.click(rotateButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Download rotated\.pdf/i })).toBeInTheDocument();
    });

    it('does not invalidate download output on inactive pageSelection changes when scope is all pages, but invalidates on angle change', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="rotate-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([200, 200]);
      const file = new File([await doc.save()], 'invalidation-test.pdf', { type: 'application/pdf', lastModified: 1710000000302 });

      await user.upload(screen.getByLabelText(/Select file for Rotate PDF/i), file);
      await waitFor(() => {
        expect(screen.getByText(/1 Page Total/i)).toBeInTheDocument();
      });

      // Step 1: Switch to selected, type a range, then switch back to 'all'
      await user.click(screen.getByRole('button', { name: /Selected Pages/i }));
      const rangeInput = screen.getByLabelText(/Pages to Rotate/i);
      await user.type(rangeInput, '1');

      // Switch back to 'all'
      await user.click(screen.getByRole('button', { name: /All Pages/i }));

      // Execute rotation for all pages
      await user.click(screen.getByRole('button', { name: /Rotate PDF/i }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });

      // Changing angle invalidates output
      await user.click(screen.getByRole('button', { name: /Rotate 180° Flip/i }));
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });
  });

  describe('PDF-04 Delete Pages Workspace Integration', () => {
    it('inspects page count and renders delete pages configuration card with badge', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="delete-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 4; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'four-pages.pdf', { type: 'application/pdf', lastModified: 1710000000400 });

      await user.upload(screen.getByLabelText(/Select file for Delete Pages/i), file);

      // Verify page count badge
      await waitFor(() => {
        expect(screen.getByText(/4 Pages Total/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 3, name: /Select Pages to Delete/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Pages to Delete/i)).toBeInTheDocument();

      // Action button should be disabled because page selection is empty
      const deleteButton = screen.getByRole('button', { name: /Delete Pages/i });
      expect(deleteButton).toBeDisabled();
    });

    it('updates deletion and retention counts in helper text and executes real deletion', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="delete-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 4; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'sample.pdf', { type: 'application/pdf', lastModified: 1710000000401 });

      await user.upload(screen.getByLabelText(/Select file for Delete Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/4 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/Pages to Delete/i);
      const deleteButton = screen.getByRole('button', { name: /Delete Pages/i });

      // Enter pages 2 and 4
      await user.type(pageInput, '2, 4');

      // Helper text updates with deletion and retention numbers
      expect(screen.getByText(/Deleting 2 pages \(2, 4\)\. Retaining 2 pages\./i)).toBeInTheDocument();
      expect(deleteButton).not.toBeDisabled();

      // Trigger deletion
      await user.click(deleteButton);

      // Result card should appear with pages-removed.pdf
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Download pages-removed\.pdf/i })).toBeInTheDocument();

      // Modifying page selection invalidates the download result immediately
      await user.type(pageInput, ', 1');
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });

    it('strictly guards against deleting all pages in the document', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="delete-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 3; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'three-pages.pdf', { type: 'application/pdf', lastModified: 1710000000402 });

      await user.upload(screen.getByLabelText(/Select file for Delete Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/Pages to Delete/i);
      const deleteButton = screen.getByRole('button', { name: /Delete Pages/i });

      // Enter all 3 pages
      await user.type(pageInput, '1-3');

      // Error message displayed and action button disabled
      expect(screen.getByText(/Cannot delete all pages from the document\. At least one page must remain\./i)).toBeInTheDocument();
      expect(deleteButton).toBeDisabled();
    });

    it('invalidates in-flight processing when input is modified', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="delete-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 3; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'in-flight.pdf', { type: 'application/pdf', lastModified: 1710000000403 });

      await user.upload(screen.getByLabelText(/Select file for Delete Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/Pages to Delete/i);
      await user.type(pageInput, '1');

      const deleteButton = screen.getByRole('button', { name: /Delete Pages/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });

      // Clear all resets state completely
      await user.click(screen.getByRole('button', { name: /Clear All/i }));
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Pages Total/i)).not.toBeInTheDocument();
    });
  });

  describe('PDF-05 Reorder Pages Workspace Integration', () => {
    it('inspects page count and renders reorder configuration card with badge and presets', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="reorder-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 4; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'four-pages.pdf', { type: 'application/pdf', lastModified: 1710000000500 });

      await user.upload(screen.getByLabelText(/Select file for Reorder Pages/i), file);

      // Verify page count badge
      await waitFor(() => {
        expect(screen.getByText(/4 Pages Total/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 3, name: /Specify Desired Page Order/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reverse Order/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reset Order/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Swap First & Last/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/New Page Sequence/i)).toBeInTheDocument();

      // Action button should be disabled because page sequence is empty
      const reorderButton = screen.getByRole('button', { name: /Reorder Pages/i });
      expect(reorderButton).toBeDisabled();
    });

    it('applies quick presets correctly and updates input and helper text', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="reorder-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 4; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'four-pages.pdf', { type: 'application/pdf', lastModified: 1710000000501 });

      await user.upload(screen.getByLabelText(/Select file for Reorder Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/4 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/New Page Sequence/i);
      const reorderButton = screen.getByRole('button', { name: /Reorder Pages/i });

      // 1. Reverse Order preset
      await user.click(screen.getByRole('button', { name: /Reverse Order/i }));
      expect(pageInput.value).toBe('4, 3, 2, 1');
      expect(screen.getByText(/New order: 4 → 3 → 2 → 1/i)).toBeInTheDocument();
      expect(reorderButton).not.toBeDisabled();

      // 2. Reset Order preset
      await user.click(screen.getByRole('button', { name: /Reset Order/i }));
      expect(pageInput.value).toBe('1, 2, 3, 4');
      expect(screen.getByText(/New order: 1 → 2 → 3 → 4/i)).toBeInTheDocument();
      expect(reorderButton).not.toBeDisabled();

      // 3. Swap First & Last preset
      await user.click(screen.getByRole('button', { name: /Swap First & Last/i }));
      expect(pageInput.value).toBe('4, 2, 3, 1');
      expect(screen.getByText(/New order: 4 → 2 → 3 → 1/i)).toBeInTheDocument();
      expect(reorderButton).not.toBeDisabled();
    });

    it('sets page order to 1 for all presets on a single-page document', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="reorder-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'one-page.pdf', { type: 'application/pdf', lastModified: 1710000000502 });

      await user.upload(screen.getByLabelText(/Select file for Reorder Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/1 Page Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/New Page Sequence/i);

      // All three presets on 1 page set '1'
      await user.click(screen.getByRole('button', { name: /Reverse Order/i }));
      expect(pageInput.value).toBe('1');

      await user.click(screen.getByRole('button', { name: /Reset Order/i }));
      expect(pageInput.value).toBe('1');

      await user.click(screen.getByRole('button', { name: /Swap First & Last/i }));
      expect(pageInput.value).toBe('1');
    });

    it('executes real production reorder-pages processor and invalidates results on input change', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="reorder-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 3; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'three-pages.pdf', { type: 'application/pdf', lastModified: 1710000000503 });

      await user.upload(screen.getByLabelText(/Select file for Reorder Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/New Page Sequence/i);
      const reorderButton = screen.getByRole('button', { name: /Reorder Pages/i });

      // Enter permutation
      await user.type(pageInput, '3, 1, 2');
      expect(screen.getByText(/New order: 3 → 1 → 2/i)).toBeInTheDocument();
      expect(reorderButton).not.toBeDisabled();

      // Trigger reordering
      await user.click(reorderButton);

      // Result card should appear with reordered.pdf
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Download reordered\.pdf/i })).toBeInTheDocument();

      // Modifying page order invalidates download result immediately
      await user.type(pageInput, ', 1');
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });

    it('validates permutation requirements and rejects duplicate or missing pages', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="reorder-pages" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 3; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'three-pages.pdf', { type: 'application/pdf', lastModified: 1710000000504 });

      await user.upload(screen.getByLabelText(/Select file for Reorder Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/New Page Sequence/i);
      const reorderButton = screen.getByRole('button', { name: /Reorder Pages/i });

      // Missing page 3
      await user.type(pageInput, '1, 2');
      expect(screen.getByText(/Missing page\(s\): 3/i)).toBeInTheDocument();
      expect(reorderButton).toBeDisabled();

      // Duplicate page 1
      await user.clear(pageInput);
      await user.type(pageInput, '1, 1, 2');
      expect(screen.getByText(/Duplicate page 1 detected/i)).toBeInTheDocument();
      expect(reorderButton).toBeDisabled();
    });

    it('cancels in-flight reordering and prevents stale completion when page order changes during active processing', async () => {
      const user = userEvent.setup();
      let resolveMock;
      const delayedPromise = new Promise((resolve) => {
        resolveMock = resolve;
      });

      const mockAdapter = {
        id: 'reorder-pages',
        isAvailable: true,
        execute: vi.fn().mockImplementation(() => delayedPromise),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="reorder-pages" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const doc = await PDFDocument.create();
      for (let i = 0; i < 3; i++) doc.addPage([100, 100]);
      const file = new File([await doc.save()], 'three-pages.pdf', { type: 'application/pdf', lastModified: 1710000000505 });

      await user.upload(screen.getByLabelText(/Select file for Reorder Pages/i), file);
      await waitFor(() => {
        expect(screen.getByText(/3 Pages Total/i)).toBeInTheDocument();
      });

      const pageInput = screen.getByLabelText(/New Page Sequence/i);
      const reorderButton = screen.getByRole('button', { name: /Reorder Pages/i });

      // Enter valid sequence
      await user.type(pageInput, '3, 2, 1');
      expect(reorderButton).not.toBeDisabled();

      // Trigger processing -> enters processing state and disables inputs
      await user.click(reorderButton);
      expect(screen.getByText(/Processing document in your local browser sandbox/i)).toBeInTheDocument();
      expect(pageInput).toBeDisabled();

      // Resolve the execution promise
      const reorderedBlob = new Blob(['%PDF-1.4 reordered result'], { type: 'application/pdf' });
      await act(async () => {
        resolveMock({
          blob: reorderedBlob,
          suggestedFilename: 'reordered.pdf',
          mimeType: 'application/pdf',
        });
      });

      // Confirm download card appears and input is re-enabled
      expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download reordered\.pdf/i })).toBeInTheDocument();
      expect(pageInput).not.toBeDisabled();

      // Modifying page sequence invalidates download card immediately
      await user.clear(pageInput);
      await user.type(pageInput, '2, 1, 3');
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });
  });

  describe('PDF-06 JPG to PDF Workspace Integration', () => {
    const BASE64_1X1_JPEG =
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxD/2Q==';

    function createTestJpeg(name = 'sample.jpg', options = {}) {
      const binaryStr = atob(BASE64_1X1_JPEG);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new File([bytes], name, { type: 'image/jpeg', ...options });
    }

    it('renders sequence badges, move up/down controls, and boundary states for multiple images', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const f1 = createTestJpeg('img1.jpg', { lastModified: 1710000000601 });
      const f2 = createTestJpeg('img2.jpg', { lastModified: 1710000000602 });
      const f3 = createTestJpeg('img3.jpg', { lastModified: 1710000000603 });

      const fileInput = screen.getByLabelText(/Select files for JPG to PDF/i);
      await user.upload(fileInput, [f1, f2, f3]);

      // Verify sequence badges
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();

      // First image: Move Up disabled, Move Down enabled
      const moveUp1 = screen.getByRole('button', { name: /Move img1\.jpg up/i });
      const moveDown1 = screen.getByRole('button', { name: /Move img1\.jpg down/i });
      expect(moveUp1).toBeDisabled();
      expect(moveDown1).not.toBeDisabled();

      // Third image: Move Up enabled, Move Down disabled
      const moveUp3 = screen.getByRole('button', { name: /Move img3\.jpg up/i });
      const moveDown3 = screen.getByRole('button', { name: /Move img3\.jpg down/i });
      expect(moveUp3).not.toBeDisabled();
      expect(moveDown3).toBeDisabled();

      // Move img1.jpg down -> img2 is now #1, img1 is #2
      await user.click(moveDown1);
      const cards = screen.getAllByText(/img\d\.jpg/i);
      expect(cards[0].textContent).toBe('img2.jpg');
      expect(cards[1].textContent).toBe('img1.jpg');
    });

    it('renders configuration card with page size and margin controls', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const f = createTestJpeg('single.jpg', { lastModified: 1710000000610 });
      await user.upload(screen.getByLabelText(/Select files for JPG to PDF/i), f);

      // Verify layout configuration card
      expect(screen.getByRole('heading', { level: 3, name: /Configure PDF Pages/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Original Size/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /A4 Portrait/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /A4 Landscape/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /A4 Auto/i })).toBeInTheDocument();

      // Default A4 portrait shows margins
      expect(screen.getByRole('button', { name: /Standard Margins/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Borderless/i })).toBeInTheDocument();

      // Click Original Size -> hides margins
      await user.click(screen.getByRole('button', { name: /Original Size/i }));
      expect(screen.queryByRole('button', { name: /Standard Margins/i })).not.toBeInTheDocument();

      // Click A4 Landscape -> restores margins
      await user.click(screen.getByRole('button', { name: /A4 Landscape/i }));
      expect(screen.getByRole('button', { name: /Standard Margins/i })).toBeInTheDocument();
    });

    it('executes real production jpg-to-pdf processor and produces download result', async () => {
      const user = userEvent.setup();
      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" />
          </MemoryRouter>
        </ThemeProvider>
      );

      const f1 = createTestJpeg('photo1.jpg', { lastModified: 1710000000620 });
      const f2 = createTestJpeg('photo2.jpg', { lastModified: 1710000000621 });
      await user.upload(screen.getByLabelText(/Select files for JPG to PDF/i), [f1, f2]);

      const convertButton = screen.getByRole('button', { name: /Convert to PDF/i });
      expect(convertButton).not.toBeDisabled();

      // Trigger conversion
      await user.click(convertButton);

      // Download banner should appear
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Download images\.pdf/i })).toBeInTheDocument();

      // Reordering images invalidates the download output immediately
      await user.click(screen.getByRole('button', { name: /Move photo1\.jpg down/i }));
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });

    it('disables workspace controls during conversion and invalidates completed results when images are reordered', async () => {
      const user = userEvent.setup();
      let resolveMock;
      const delayedPromise = new Promise((resolve) => {
        resolveMock = resolve;
      });

      const mockAdapter = {
        id: 'jpg-to-pdf',
        isAvailable: true,
        execute: vi.fn().mockImplementation(() => delayedPromise),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const f1 = createTestJpeg('imgA.jpg', { lastModified: 1710000000630 });
      const f2 = createTestJpeg('imgB.jpg', { lastModified: 1710000000631 });
      await user.upload(screen.getByLabelText(/Select files for JPG to PDF/i), [f1, f2]);

      const convertBtn = screen.getByRole('button', { name: /Convert to PDF/i });
      await user.click(convertBtn);

      expect(screen.getByText(/Processing document in your local browser sandbox/i)).toBeInTheDocument();

      // Controls are disabled during active conversion
      expect(screen.getByRole('button', { name: /Move imgA\.jpg down/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Remove imgA\.jpg/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Clear All/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Select Files/i })).toBeDisabled();

      // Resolve the execution promise
      await act(async () => {
        resolveMock({
          blob: new Blob(['images output'], { type: 'application/pdf' }),
          suggestedFilename: 'images.pdf',
          mimeType: 'application/pdf',
        });
      });

      expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download images\.pdf/i })).toBeInTheDocument();

      // Reordering after completion immediately invalidates download result
      await user.click(screen.getByRole('button', { name: /Move imgA\.jpg down/i }));
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
    });

    it('invalidates completed results when an image is removed or layout options change', async () => {
      const user = userEvent.setup();
      let resolveMock;
      const delayedPromise = new Promise((resolve) => {
        resolveMock = resolve;
      });

      const mockAdapter = {
        id: 'jpg-to-pdf',
        isAvailable: true,
        execute: vi.fn().mockImplementation(() => delayedPromise),
      };

      render(
        <ThemeProvider>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ToolWorkspace slugOverride="jpg-to-pdf" processorAdapterOverride={mockAdapter} />
          </MemoryRouter>
        </ThemeProvider>
      );

      const f1 = createTestJpeg('keep.jpg', { lastModified: 1710000000640 });
      const f2 = createTestJpeg('remove.jpg', { lastModified: 1710000000641 });
      await user.upload(screen.getByLabelText(/Select files for JPG to PDF/i), [f1, f2]);

      const convertBtn = screen.getByRole('button', { name: /Convert to PDF/i });
      await user.click(convertBtn);

      expect(screen.getByText(/Processing document in your local browser sandbox/i)).toBeInTheDocument();

      // Resolve promise
      await act(async () => {
        resolveMock({
          blob: new Blob(['images output'], { type: 'application/pdf' }),
          suggestedFilename: 'images.pdf',
          mimeType: 'application/pdf',
        });
      });

      expect(screen.getByRole('heading', { level: 2, name: /Ready for Download/i })).toBeInTheDocument();

      // Removing an image invalidates download card immediately
      await user.click(screen.getByRole('button', { name: /Remove remove\.jpg/i }));
      expect(screen.queryByRole('heading', { level: 2, name: /Ready for Download/i })).not.toBeInTheDocument();
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
