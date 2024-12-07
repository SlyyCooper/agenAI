import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccessReport } from '@/components/research/output/AccessReport';
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('@/hooks/useStorage');
jest.mock('react-hot-toast');

describe('AccessReport Component', () => {
  const mockDownloadFile = jest.fn();
  const mockReportUrl = 'test-report-url';

  beforeEach(() => {
    // Setup mocks
    (useStorage as jest.Mock).mockReturnValue({
      downloadFile: mockDownloadFile
    });
    (toast.success as jest.Mock) = jest.fn();
    (toast.error as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders access report button', () => {
    render(<AccessReport reportUrl={mockReportUrl} />);
    expect(screen.getByRole('button', { name: /access report/i })).toBeInTheDocument();
  });

  it('handles successful report download', async () => {
    mockDownloadFile.mockResolvedValueOnce('test-content');
    
    render(<AccessReport reportUrl={mockReportUrl} />);
    
    const button = screen.getByRole('button', { name: /access report/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(mockReportUrl);
      expect(toast.success).toHaveBeenCalledWith('Report downloaded successfully');
    });
  });

  it('handles download error', async () => {
    mockDownloadFile.mockRejectedValueOnce(new Error('Download failed'));
    
    render(<AccessReport reportUrl={mockReportUrl} />);
    
    const button = screen.getByRole('button', { name: /access report/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockDownloadFile).toHaveBeenCalledWith(mockReportUrl);
      expect(toast.error).toHaveBeenCalledWith('Failed to download report');
    });
  });
}); 