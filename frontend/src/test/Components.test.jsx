import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  DatePicker,
  Dropdown,
  DropdownItem,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
  StatCard,
  Stepper,
  Switch,
  Tabs,
  Textarea,
  Tooltip,
} from '../components/ui';

describe('Design System UI Components', () => {
  describe('Button Component', () => {
    it('renders text and responds to click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);

      const btn = screen.getByRole('button', { name: /Click Me/i });
      expect(btn).toBeInTheDocument();
      await user.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders all variants without crashing', () => {
      const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger', 'gold', 'indigo'];
      variants.forEach((variant) => {
        const { unmount } = render(<Button variant={variant}>{variant}</Button>);
        expect(screen.getByRole('button', { name: variant })).toBeInTheDocument();
        unmount();
      });
    });

    it('blocks click events when disabled', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      const btn = screen.getByRole('button', { name: /Disabled/i });
      expect(btn).toBeDisabled();
      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('shows loading spinner and blocks clicks during loading state', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button isLoading onClick={handleClick}>Submit</Button>);

      const btn = screen.getByRole('button', { name: /Submit/i });
      expect(btn).toHaveAttribute('aria-busy', 'true');
      await user.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Form Inputs', () => {
    it('renders Input with label, placeholder, and handles change', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <Input
          label="Username"
          placeholder="Enter username"
          onChange={handleChange}
        />
      );

      const input = screen.getByPlaceholderText('Enter username');
      expect(screen.getByText('Username')).toBeInTheDocument();
      await user.type(input, 'Alex');
      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('Alex');
    });

    it('renders Input error message with role="alert"', () => {
      render(<Input label="Email" error="Invalid email address" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Invalid email address');
    });

    it('renders Select with options', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <Select
          label="Sport"
          options={[
            { value: 'badminton', label: 'Badminton' },
            { value: 'tennis', label: 'Tennis' },
          ]}
          onChange={handleChange}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      await user.selectOptions(select, 'tennis');
      expect(handleChange).toHaveBeenCalled();
      expect(select).toHaveValue('tennis');
    });

    it('renders Textarea with character count', async () => {
      const user = userEvent.setup();
      render(<Textarea label="Notes" showCount maxLength={100} defaultValue="Hello" />);
      expect(screen.getByText('5/100')).toBeInTheDocument();
    });

    it('renders Checkbox and handles toggle', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Checkbox label="Accept terms" onChange={handleChange} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
    });

    it('renders Switch component with accessible switch role', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Switch label="Dark Mode" checked={false} onChange={handleChange} />);

      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      await user.click(toggle);
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('renders DatePicker component', () => {
      render(<DatePicker label="Session Date" value="2026-10-06" onChange={() => {}} />);
      expect(screen.getByLabelText(/Session Date/i)).toBeInTheDocument();
    });
  });

  describe('Badges, Cards, & Metrics', () => {
    it('renders Badges with all tier variants', () => {
      const { rerender } = render(<Badge variant="gold">Gold VIP</Badge>);
      expect(screen.getByText('Gold VIP')).toBeInTheDocument();

      rerender(<Badge variant="silver">Silver</Badge>);
      expect(screen.getByText('Silver')).toBeInTheDocument();

      rerender(<Badge variant="junior">Junior</Badge>);
      expect(screen.getByText('Junior')).toBeInTheDocument();
    });

    it('renders Card with header, content, and footer', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Main content body</CardContent>
          <CardFooter>Footer info</CardFooter>
        </Card>
      );

      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Main content body')).toBeInTheDocument();
      expect(screen.getByText('Footer info')).toBeInTheDocument();
    });

    it('renders StatCard with title and formatted value', () => {
      render(
        <StatCard
          title="Daily Court Revenue"
          value={1200}
          prefix="$"
          trend={15}
        />
      );
      expect(screen.getByText('Daily Court Revenue')).toBeInTheDocument();
      expect(screen.getByText(/\+15%/)).toBeInTheDocument();
    });

    it('renders Stepper with active and completed steps', () => {
      render(
        <Stepper
          activeStep={1}
          steps={[
            { title: 'Step 1' },
            { title: 'Step 2' },
            { title: 'Step 3' },
          ]}
        />
      );
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });
  });

  describe('Feedback & Utility States', () => {
    it('renders Skeleton component variants', () => {
      const { unmount } = render(<Skeleton variant="circular" width={32} height={32} data-testid="skel" />);
      expect(screen.getByTestId('skel')).toBeInTheDocument();
      unmount();
    });

    it('renders EmptyState with icon and title', () => {
      render(<EmptyState title="No Bookings" description="Zero records available." />);
      expect(screen.getByText('No Bookings')).toBeInTheDocument();
      expect(screen.getByText('Zero records available.')).toBeInTheDocument();
    });

    it('renders ErrorState with message and trace ID', () => {
      render(
        <ErrorState
          title="Booking Collision"
          message="Overlap detected"
          traceId="trace-9912"
        />
      );
      expect(screen.getByText('Booking Collision')).toBeInTheDocument();
      expect(screen.getByText('Overlap detected')).toBeInTheDocument();
      expect(screen.getByText(/trace-9912/)).toBeInTheDocument();
    });

    it('renders Dropdown and toggles menu on trigger click', async () => {
      const user = userEvent.setup();
      render(
        <Dropdown trigger={<button>Open Menu</button>}>
          <DropdownItem>Item 1</DropdownItem>
        </Dropdown>
      );

      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Open Menu/i }));
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });
});
