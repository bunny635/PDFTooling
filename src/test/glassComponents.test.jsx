import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  GlassBadge,
  GlassModal,
  GlassSkeleton,
} from '../components/glass/index.js';
import { ThemeProvider } from '../app/providers/ThemeProvider.jsx';

describe('GlassButton Component', () => {
  it('renders primary variant by default with correct text', () => {
    render(<GlassButton>Click Me</GlassButton>);
    const button = screen.getByRole('button', { name: /Click Me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-accent');
  });

  it('renders secondary, ghost, and danger variants', () => {
    const { rerender } = render(<GlassButton variant="secondary">Secondary</GlassButton>);
    expect(screen.getByRole('button')).toHaveClass('glass-floating');

    rerender(<GlassButton variant="ghost">Ghost</GlassButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');

    rerender(<GlassButton variant="danger">Danger</GlassButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-status-danger');
  });

  it('handles disabled and loading states correctly', () => {
    const { rerender } = render(<GlassButton disabled>Disabled Action</GlassButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    rerender(<GlassButton isLoading>Processing</GlassButton>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('fires onClick callback when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<GlassButton onClick={handleClick}>Trigger</GlassButton>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('GlassCard Component', () => {
  it('renders children with glass-panel styling', () => {
    render(<GlassCard>Card Content</GlassCard>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('applies interactive styles when interactive prop is true', () => {
    render(<GlassCard interactive data-testid="card">Interactive</GlassCard>);
    expect(screen.getByTestId('card')).toHaveClass('cursor-pointer');
  });
});

describe('GlassInput Component', () => {
  it('renders label and binds htmlFor to input id', () => {
    render(<GlassInput label="Document Name" id="doc-name" />);
    const label = screen.getByText('Document Name');
    const input = screen.getByRole('textbox');
    expect(label).toHaveAttribute('for', 'doc-name');
    expect(input).toHaveAttribute('id', 'doc-name');
  });

  it('renders helper text when provided', () => {
    render(<GlassInput label="Page Range" helperText="Example: 1-5, 8, 11-14" />);
    expect(screen.getByText('Example: 1-5, 8, 11-14')).toBeInTheDocument();
  });

  it('renders error message and sets aria-invalid and aria-describedby', () => {
    render(<GlassInput label="Page Range" error="Invalid page range entered" />);
    const input = screen.getByRole('textbox');
    const errorMessage = screen.getByText('Invalid page range entered');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(errorMessage.id);
  });
});

describe('GlassBadge Component', () => {
  it('renders different status variants', () => {
    const { rerender } = render(<GlassBadge variant="success">Active</GlassBadge>);
    expect(screen.getByText('Active')).toHaveClass('text-status-success');

    rerender(<GlassBadge variant="accent">Category</GlassBadge>);
    expect(screen.getByText('Category')).toHaveClass('text-accent');
  });
});

describe('GlassSkeleton Component', () => {
  it('renders with accessible role and loading text', () => {
    render(<GlassSkeleton width="100px" height="20px" />);
    const skeleton = screen.getByRole('status', { name: /Loading.../i });
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveStyle({ width: '100px', height: '20px' });
  });
});

describe('GlassModal Component', () => {
  function ModalTestHarness({ defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
      <div>
        <button id="trigger-btn" onClick={() => setIsOpen(true)}>
          Open Dialog
        </button>
        <GlassModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          description="Are you sure you want to proceed?"
        >
          <button id="action-btn" onClick={() => setIsOpen(false)}>
            Confirm
          </button>
        </GlassModal>
      </div>
    );
  }

  it('does not render when isOpen is false', () => {
    render(<ModalTestHarness defaultOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with accessible title, description, and close button when isOpen is true', () => {
    render(<ModalTestHarness defaultOpen={true} />);
    const dialog = screen.getByRole('dialog', { name: 'Confirm Action' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close dialog/i })).toBeInTheDocument();
  });

  it('closes on Escape key press and restores focus', async () => {
    const user = userEvent.setup();
    render(<ModalTestHarness defaultOpen={false} />);

    const triggerBtn = screen.getByRole('button', { name: 'Open Dialog' });
    await user.click(triggerBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Press Escape
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(triggerBtn);
  });
});
