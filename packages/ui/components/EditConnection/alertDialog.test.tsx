import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AlertDialog from './alertDialog';


describe('Alert Dialog component', () => {
    it('renders without throwing any errors', () => {
        expect(() => {
            render(<AlertDialog open={true} close={() => { }} />);
        }).not.toThrow();
    });

    it('should not render dialog when open is false ', () => {
        render(<AlertDialog open={false} close={() => { }} />);
        expect(screen.queryByText('It looks like')).not.toBeInTheDocument();
    });

    it('should call close function when close button is clicked', () => {
        const handleClose = jest.fn();
        render(<AlertDialog open={true} close={handleClose} />);
        const closeButton = screen.getByTestId('CloseIcon');
        fireEvent.click(closeButton)
        expect(handleClose).toBeCalled();
    });
});