import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AllTools from '../pages/AllTools.jsx';
import { getAllTools } from '../config/toolRegistry.js';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';

function renderAllTools() {
  return render(
    <ThemeProvider>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AllTools />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('AllTools Page Component (WEB-02)', () => {
  it('renders page header and all six registry tools initially', () => {
    renderAllTools();

    expect(screen.getByRole('heading', { level: 1, name: /All PDF Tools/i })).toBeInTheDocument();
    expect(screen.getByText(/Showing 6 of 6 tools/i)).toBeInTheDocument();

    const tools = getAllTools();
    expect(tools).toHaveLength(6);

    tools.forEach((tool) => {
      expect(screen.getByRole('heading', { level: 2, name: tool.name })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: new RegExp(`Open ${tool.name}`, 'i') })).toHaveAttribute(
        'href',
        tool.route
      );
    });
  });

  it('filters tools by search term in tool name (case-insensitive with whitespace trimming)', async () => {
    const user = userEvent.setup();
    renderAllTools();

    const searchInput = screen.getByPlaceholderText(/Search by tool name or keyword/i);

    // Type with whitespace and mixed case
    await user.type(searchInput, '   mErGe   ');

    // Result count should update
    expect(screen.getByText(/Showing 1 of 6 tools/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Merge PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Split PDF' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Rotate PDF' })).not.toBeInTheDocument();
  });

  it('filters tools by search term matching description keywords', async () => {
    const user = userEvent.setup();
    renderAllTools();

    const searchInput = screen.getByPlaceholderText(/Search by tool name or keyword/i);

    // Search for keyword in JPG to PDF description: "customizable" or "JPEG"
    await user.type(searchInput, 'JPEG');

    expect(screen.getByText(/Showing 1 of 6 tools/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'JPG to PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Merge PDF' })).not.toBeInTheDocument();
  });

  it('filters tools by category using human-readable category pills', async () => {
    const user = userEvent.setup();
    renderAllTools();

    // Organize category should contain 3 tools: Merge PDF, Rotate PDF, Reorder Pages
    const organizeBtn = screen.getByRole('button', { name: 'Organize' });
    expect(organizeBtn).toHaveAttribute('aria-pressed', 'false');

    await user.click(organizeBtn);
    expect(organizeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Showing 3 of 6 tools/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Merge PDF' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Rotate PDF' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Reorder Pages' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Split PDF' })).not.toBeInTheDocument();

    // Extract category should contain 1 tool: Split PDF
    const extractBtn = screen.getByRole('button', { name: 'Extract' });
    await user.click(extractBtn);
    expect(screen.getByText(/Showing 1 of 6 tools/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Split PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Merge PDF' })).not.toBeInTheDocument();
  });

  it('combines search and category filtering together accurately', async () => {
    const user = userEvent.setup();
    renderAllTools();

    // Select category 'Organize' (has Merge, Rotate, Reorder)
    await user.click(screen.getByRole('button', { name: 'Organize' }));
    expect(screen.getByText(/Showing 3 of 6 tools/i)).toBeInTheDocument();

    // Now search for 'rotate'
    const searchInput = screen.getByPlaceholderText(/Search by tool name or keyword/i);
    await user.type(searchInput, 'rotate');

    expect(screen.getByText(/Showing 1 of 6 tools/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Rotate PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Merge PDF' })).not.toBeInTheDocument();

    // Search for something not in Organize (e.g. 'split') -> should be 0 matches
    await user.clear(searchInput);
    await user.type(searchInput, 'split');
    expect(screen.getByText(/Showing 0 of 6 tools/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /No matching tools found/i })).toBeInTheDocument();
  });

  it('displays empty state with helpful message and restores catalog on reset', async () => {
    const user = userEvent.setup();
    renderAllTools();

    const searchInput = screen.getByPlaceholderText(/Search by tool name or keyword/i);
    await user.type(searchInput, 'nonexistentxyzterm');

    expect(screen.getByRole('heading', { level: 2, name: /No matching tools found/i })).toBeInTheDocument();
    expect(screen.getByText(/nonexistentxyzterm/i)).toBeInTheDocument();

    // Click 'Clear filters' button
    const clearBtn = screen.getByRole('button', { name: /Clear filters/i });
    await user.click(clearBtn);

    // Full catalog restored
    expect(screen.getByText(/Showing 6 of 6 tools/i)).toBeInTheDocument();
    expect(searchInput).toHaveValue('');
    expect(screen.getByRole('button', { name: 'All Tools' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('allows clearing search input via inline X button', async () => {
    const user = userEvent.setup();
    renderAllTools();

    const searchInput = screen.getByPlaceholderText(/Search by tool name or keyword/i);
    await user.type(searchInput, 'merge');
    expect(screen.getByText(/Showing 1 of 6 tools/i)).toBeInTheDocument();

    const clearInputBtn = screen.getByRole('button', { name: /Clear search query/i });
    await user.click(clearInputBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText(/Showing 6 of 6 tools/i)).toBeInTheDocument();
  });
});
