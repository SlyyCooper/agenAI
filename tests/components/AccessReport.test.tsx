import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AccessReport from '@/components/research/output/AccessReport';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('@/hooks/useStorage');
vi.mock('react-hot-toast');

describe('AccessReport Component', () => {
  const mockGetFileUrl = vi.fn();
  const mockDownloadFile = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock useStorage hook
    (useStorage as any).mockReturnValue({
      getFileUrl: mockGetFileUrl,
      downloadFile: mockDownloadFile
    });

    // Mock window.URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  const mockAccessData = {
    pdf: 'reports/test.pdf',
    docx: 'reports/test.docx',
    md: true
  };

  const mockReport = '# Test Report\nThis is a test report.';

  it('should render all download buttons when all formats are available', () => {
    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Save Report')).toBeInTheDocument();
    expect(screen.getByText('View PDF')).toBeInTheDocument();
    expect(screen.getByText('Download DOCX')).toBeInTheDocument();
    expect(screen.getByText('Copy Markdown')).toBeInTheDocument();
  });

  it('should handle save action', async () => {
    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save Report');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Report saved successfully');
    });
  });

  it('should handle save error', async () => {
    mockOnSave.mockRejectedValueOnce(new Error('Save failed'));

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save Report');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save report');
    });
  });

  it('should handle PDF download', async () => {
    mockGetFileUrl.mockResolvedValueOnce('https://example.com/test.pdf');
    global.fetch = vi.fn().mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'application/pdf' }))
    });

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const pdfButton = screen.getByText('View PDF');
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(mockGetFileUrl).toHaveBeenCalledWith('reports/test.pdf');
      expect(toast.success).toHaveBeenCalledWith('Downloaded PDF file');
    });
  });

  it('should handle DOCX download', async () => {
    mockGetFileUrl.mockResolvedValueOnce('https://example.com/test.docx');
    global.fetch = vi.fn().mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
    });

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const docxButton = screen.getByText('Download DOCX');
    fireEvent.click(docxButton);

    await waitFor(() => {
      expect(mockGetFileUrl).toHaveBeenCalledWith('reports/test.docx');
      expect(toast.success).toHaveBeenCalledWith('Downloaded DOCX file');
    });
  });

  it('should handle markdown copy', async () => {
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValueOnce(undefined)
    };
    Object.assign(navigator, {
      clipboard: mockClipboard
    });

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const copyButton = screen.getByText('Copy Markdown');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(mockReport);
      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard');
    });
  });

  it('should handle download errors', async () => {
    mockGetFileUrl.mockRejectedValueOnce(new Error('Download failed'));

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const pdfButton = screen.getByText('View PDF');
    fireEvent.click(pdfButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to download PDF file');
    });
  });

  it('should show loading state during download', async () => {
    mockGetFileUrl.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const pdfButton = screen.getByText('View PDF');
    fireEvent.click(pdfButton);

    expect(screen.getByText('Downloading...')).toBeInTheDocument();
  });

  it('should disable buttons during operations', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <AccessReport 
        accessData={mockAccessData}
        report={mockReport}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save Report');
    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
  });
}); 