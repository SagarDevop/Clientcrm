import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../components/common/Badge.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { Users } from 'lucide-react';

describe('UI Component Library', () => {
  it('renders Badge with correct variant styling', () => {
    const { container } = render(<Badge variant="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-emerald-800');
  });

  it('renders EmptyState with action trigger', () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Users}
        title="No clients found"
        description="Try adding a new client"
        actionLabel="Add Client"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No clients found')).toBeInTheDocument();
    const btn = screen.getByText('Add Client');
    fireEvent.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('renders Modal when isOpen is true and triggers onClose', () => {
    const handleClose = vi.fn();
    const { rerender } = render(
      <Modal isOpen={false} onClose={handleClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();

    rerender(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <div>Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders ConfirmDialog and triggers confirmation action', async () => {
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Confirm Delete"
        message="Are you sure?"
        confirmText="Yes, Delete"
        isDestructive={true}
      />
    );

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    const confirmBtn = screen.getByText('Yes, Delete');
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
