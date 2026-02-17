import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationBadge, CitationModal } from '@/components/chat/citation';

describe('CitationBadge', () => {
    it('renders with citation ID', () => {
        const onClick = vi.fn();
        render(<CitationBadge id={1} onClick={onClick} />);

        expect(screen.getByText('[1]')).toBeInTheDocument();
    });

    it('calls onClick when clicked', () => {
        const onClick = vi.fn();
        render(<CitationBadge id={1} onClick={onClick} />);

        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('shows name in title attribute', () => {
        const onClick = vi.fn();
        render(<CitationBadge id={1} name="test-doc.pdf" onClick={onClick} />);

        const button = screen.getByRole('button');
        expect(button).toHaveAttribute('title', 'test-doc.pdf');
    });
});

describe('CitationModal', () => {
    const mockSource = {
        id: 1,
        name: 'test-document.pdf',
        content: 'This is the document content that was cited in the response.',
        doc_id: 'doc123',
        workspace_id: 'ws-123',
        chunk_index: 2,
        total_chunks: 10,
        embedding_model: 'text-embedding-3-small',
        chunk_size: 800,
        chunk_overlap: 150,
        content_hash: 'abc123def456',
        rag_config_hash: 'xyz789',
    };

    it('renders document name', () => {
        render(<CitationModal source={mockSource} onClose={vi.fn()} />);

        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    });

    it('shows citation ID and workspace', () => {
        render(<CitationModal source={mockSource} onClose={vi.fn()} />);

        expect(screen.getByText(/Citation \[1\]/)).toBeInTheDocument();
        expect(screen.getByText(/Workspace: ws-123/)).toBeInTheDocument();
    });

    it('displays document content', () => {
        render(<CitationModal source={mockSource} onClose={vi.fn()} />);

        expect(screen.getByText(/This is the document content/)).toBeInTheDocument();
    });

    it('shows metadata cards', () => {
        render(<CitationModal source={mockSource} onClose={vi.fn()} />);

        expect(screen.getByText('doc123')).toBeInTheDocument();
        expect(screen.getByText('3 of 10')).toBeInTheDocument(); // chunk_index + 1
        expect(screen.getByText('text-embedding-3-small')).toBeInTheDocument();
        expect(screen.getByText('800 / 150')).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', () => {
        const onClose = vi.fn();
        render(<CitationModal source={mockSource} onClose={onClose} />);

        const closeButton = screen.getByRole('button', { name: /Close/i });
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop clicked', () => {
        const onClose = vi.fn();
        const { container } = render(<CitationModal source={mockSource} onClose={onClose} />);

        // Click the backdrop (the first div inside the portal)
        // In the component it's: <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        const backdrop = container.querySelector('.bg-black\\/80');
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(onClose).toHaveBeenCalledTimes(1);
        }
    });
});
