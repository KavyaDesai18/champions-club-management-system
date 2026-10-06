import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '../components/ui/Table';

describe('Table Component Behaviors', () => {
  const columns = [
    { key: 'name', label: 'Court Name', sortable: true },
    { key: 'sport', label: 'Sport Type', sortable: true },
    { key: 'rate', label: 'Rate' },
  ];

  const testData = [
    { id: 1, name: 'Badminton 1', sport: 'Badminton', rate: '$20' },
    { id: 2, name: 'Tennis 1', sport: 'Tennis', rate: '$35' },
    { id: 3, name: 'Squash 1', sport: 'Squash', rate: '$25' },
  ];

  it('renders table headers and data rows correctly', () => {
    render(<Table columns={columns} data={testData} />);

    expect(screen.getByText('Court Name')).toBeInTheDocument();
    expect(screen.getByText('Sport Type')).toBeInTheDocument();
    expect(screen.getByText('Badminton 1')).toBeInTheDocument();
    expect(screen.getByText('Tennis 1')).toBeInTheDocument();
    expect(screen.getByText('Squash 1')).toBeInTheDocument();
  });

  it('renders empty message when data is empty', () => {
    render(<Table columns={columns} data={[]} emptyMessage="No courts available" />);
    expect(screen.getByText('No courts available')).toBeInTheDocument();
  });

  it('renders skeleton rows when isLoading is true', () => {
    const { container } = render(
      <Table columns={columns} data={testData} isLoading={true} skeletonRows={3} />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('sorts columns when clicking sortable header', async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} data={testData} />);

    const header = screen.getByText('Court Name');
    // First click: asc
    await user.click(header);
    const rowsAsc = screen.getAllByRole('row');
    expect(rowsAsc[1]).toHaveTextContent('Badminton 1');

    // Second click: desc
    await user.click(header);
    const rowsDesc = screen.getAllByRole('row');
    expect(rowsDesc[1]).toHaveTextContent('Tennis 1');
  });

  it('handles pagination correctly', async () => {
    const user = userEvent.setup();
    render(<Table columns={columns} data={testData} itemsPerPage={1} />);

    expect(screen.getByText(/Page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText('Badminton 1')).toBeInTheDocument();
    expect(screen.queryByText('Tennis 1')).not.toBeInTheDocument();

    const nextBtn = screen.getByLabelText('Next page');
    await user.click(nextBtn);

    expect(screen.getByText(/Page 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText('Tennis 1')).toBeInTheDocument();
  });
});
