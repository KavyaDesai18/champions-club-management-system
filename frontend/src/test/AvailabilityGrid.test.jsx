import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AvailabilityGrid from '../components/availability/AvailabilityGrid';

describe('AvailabilityGrid Component', () => {
  const mockSports = [
    { id: 'sport-1', name: 'Badminton' },
    { id: 'sport-2', name: 'Tennis' },
  ];

  const mockAvailabilityData = {
    date: '2026-10-08',
    clubTimezone: 'Asia/Kolkata',
    facilityClosed: false,
    courts: [
      {
        courtId: 'court-1',
        courtName: 'Badminton Court 1',
        sportName: 'Badminton',
        surface: 'SYNTHETIC',
        indoor: true,
        status: 'ACTIVE',
        slots: [
          {
            startTime: '2026-10-08T06:00:00Z',
            endTime: '2026-10-08T07:00:00Z',
            localStartTime: '06:00:00',
            localEndTime: '07:00:00',
            state: 'AVAILABLE',
            price: 20.00,
            formattedPrice: '₹20.00',
          },
          {
            startTime: '2026-10-08T06:30:00Z',
            endTime: '2026-10-08T07:30:00Z',
            localStartTime: '06:30:00',
            localEndTime: '07:30:00',
            state: 'BOOKED',
            price: 20.00,
            formattedPrice: '₹20.00',
            reason: 'Reserved',
          },
          {
            startTime: '2026-10-08T07:00:00Z',
            endTime: '2026-10-08T08:00:00Z',
            localStartTime: '07:00:00',
            localEndTime: '08:00:00',
            state: 'HELD',
            price: 20.00,
            formattedPrice: '₹20.00',
            reason: 'Cart Hold',
          },
          {
            startTime: '2026-10-08T07:30:00Z',
            endTime: '2026-10-08T08:30:00Z',
            localStartTime: '07:30:00',
            localEndTime: '08:30:00',
            state: 'BLOCKED',
            price: 20.00,
            formattedPrice: '₹20.00',
            reason: 'Maintenance',
          },
          {
            startTime: '2026-10-08T08:00:00Z',
            endTime: '2026-10-08T09:00:00Z',
            localStartTime: '08:00:00',
            localEndTime: '09:00:00',
            state: 'PAST',
            price: 20.00,
            formattedPrice: '₹20.00',
          },
          {
            startTime: '2026-10-08T18:00:00Z',
            endTime: '2026-10-08T19:00:00Z',
            localStartTime: '18:00:00',
            localEndTime: '19:00:00',
            state: 'SOCIAL',
            price: 0.00,
            formattedPrice: 'FREE',
            reason: 'Friday Mixer',
          },
        ],
      },
      {
        courtId: 'court-2',
        courtName: 'Tennis Court 1',
        sportName: 'Tennis',
        surface: 'ACRYLIC_HARD',
        indoor: false,
        status: 'ACTIVE',
        slots: [
          {
            startTime: '2026-10-08T06:00:00Z',
            endTime: '2026-10-08T07:00:00Z',
            localStartTime: '06:00:00',
            localEndTime: '07:00:00',
            state: 'AVAILABLE',
            price: 35.00,
            formattedPrice: '₹35.00',
          },
        ],
      },
    ],
  };

  it('renders availability grid with courts as columns and times as rows', () => {
    render(
      <AvailabilityGrid
        availabilityData={mockAvailabilityData}
        isLoading={false}
        selectedDate="2026-10-08"
        onDateChange={vi.fn()}
        sports={mockSports}
        selectedSportId={null}
        onSportChange={vi.fn()}
        onSlotSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Badminton Court 1')).toBeInTheDocument();
    expect(screen.getByText('Tennis Court 1')).toBeInTheDocument();
    expect(screen.getByText('06:00:00')).toBeInTheDocument();
    expect(screen.getByText('06:30:00')).toBeInTheDocument();
  });

  it('renders all distinct slot states (AVAILABLE, BOOKED, HELD, BLOCKED, PAST, SOCIAL)', () => {
    render(
      <AvailabilityGrid
        availabilityData={mockAvailabilityData}
        isLoading={false}
        selectedDate="2026-10-08"
        onDateChange={vi.fn()}
        sports={mockSports}
        selectedSportId={null}
        onSportChange={vi.fn()}
        onSlotSelect={vi.fn()}
      />
    );

    // Legend elements & cell state badges
    expect(screen.getAllByText('Available').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Booked').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cart Hold').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blocked').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Past').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Social Mixer').length).toBeGreaterThan(0);
  });

  it('toggles to mobile list mode view cleanly', () => {
    render(
      <AvailabilityGrid
        availabilityData={mockAvailabilityData}
        isLoading={false}
        selectedDate="2026-10-08"
        onDateChange={vi.fn()}
        sports={mockSports}
        selectedSportId={null}
        onSportChange={vi.fn()}
        onSlotSelect={vi.fn()}
      />
    );

    const listBtn = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listBtn);

    // List mode renders cards with court status
    expect(screen.getAllByText('ACTIVE').length).toBe(2);
  });

  it('calls onSlotSelect when clicking an available slot', () => {
    const onSlotSelect = vi.fn();
    render(
      <AvailabilityGrid
        availabilityData={mockAvailabilityData}
        isLoading={false}
        selectedDate="2026-10-08"
        onDateChange={vi.fn()}
        sports={mockSports}
        selectedSportId={null}
        onSportChange={vi.fn()}
        onSlotSelect={onSlotSelect}
      />
    );

    const availableButtons = screen.getAllByRole('button', { name: /available/i });
    fireEvent.click(availableButtons[0]);

    expect(onSlotSelect).toHaveBeenCalled();
  });

  it('renders facility closed banner when facilityClosed is true', () => {
    const closedData = {
      ...mockAvailabilityData,
      facilityClosed: true,
      closureReason: 'National Sports Holiday',
    };

    render(
      <AvailabilityGrid
        availabilityData={closedData}
        isLoading={false}
        selectedDate="2026-10-08"
        onDateChange={vi.fn()}
        sports={mockSports}
        selectedSportId={null}
        onSportChange={vi.fn()}
        onSlotSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Facility Closed on 2026-10-08/i)).toBeInTheDocument();
    expect(screen.getByText(/National Sports Holiday/i)).toBeInTheDocument();
  });
});
