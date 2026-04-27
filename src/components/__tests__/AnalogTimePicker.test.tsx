import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalogTimePicker } from '../AnalogTimePicker';

describe('AnalogTimePicker Component', () => {
  it('renders with the initial value correctly formatted', () => {
    // 14:30 should be 02:30 PM
    render(<AnalogTimePicker value="14:30" onChange={() => {}} />);
    expect(screen.getByText('02:30 PM')).toBeInTheDocument();
  });

  it('renders with AM correctly', () => {
    render(<AnalogTimePicker value="08:15" onChange={() => {}} />);
    expect(screen.getByText('08:15 AM')).toBeInTheDocument();
  });

  it('opens the clock face when clicked', async () => {
    render(<AnalogTimePicker value="10:00" onChange={() => {}} />);
    
    const trigger = screen.getByText('10:00 AM');
    fireEvent.click(trigger);

    // The popover should be open. Use a more specific matcher or check for "Done"
    expect(await screen.findByText('Done')).toBeInTheDocument();
    
    // Selection display should show "10"
    const display = screen.getAllByText('10');
    expect(display.length).toBeGreaterThan(0);
  });

  it('toggles AM/PM correctly', async () => {
    const handleChange = vi.fn();
    render(<AnalogTimePicker value="10:00" onChange={handleChange} />);
    
    fireEvent.click(screen.getByText('10:00 AM'));
    
    // Find the PM button in the popover
    const pmButton = await screen.findByText('PM');
    fireEvent.click(pmButton);

    // Should call onChange with 22:00
    expect(handleChange).toHaveBeenCalledWith('22:00');
  });

  it('changes hour when clicking on the clock face', async () => {
    const handleChange = vi.fn();
    render(<AnalogTimePicker value="10:00" onChange={handleChange} />);
    
    fireEvent.click(screen.getByText('10:00 AM'));
    
    // The clock face uses onMouseDown/onMouseUp.
    // We need to trigger these on the number or the face.
    const number3 = await screen.findByText('3');
    fireEvent.mouseDown(number3);
    fireEvent.mouseUp(number3);

    // Should call onChange with 03:00
    expect(handleChange).toHaveBeenCalledWith('03:00');
  });

  it('closes when clicking Done', async () => {
    render(<AnalogTimePicker value="10:00" onChange={() => {}} />);
    
    fireEvent.click(screen.getByText('10:00 AM'));
    const doneButton = screen.getByText('Done');
    expect(doneButton).toBeInTheDocument();

    fireEvent.click(doneButton);
    
    // Use waitFor to handle the close animation/unmount
    await vi.waitFor(() => {
        expect(screen.queryByText('Done')).not.toBeInTheDocument();
    }, { timeout: 500 });
  });
});
