import React from 'react';
import { render, screen } from '@testing-library/react';
import Verify from './verify';

describe('Verify component', () => {
    it('renders without throwing any errors', () => {
        const data = {
            username: '',
            facility_id: '',
            MSH3: '',
            MSH4: '',
            MSH5: '',
            MSH6: '',
            MSH22: '',
            RXA11: '',
        }
        expect(() => {
            render(<Verify destinationById={data} value={data} />);
        }).not.toThrow();
    });

    it('renders without throwing any errors when empty data is passed', () => {
        const data = {}
        expect(() => {
            render(<Verify destinationById={data} value={data} />);
        }).not.toThrow();
    });

    it('should render data passed in', () => {
        const data = {
            username: 'existingUsername',
            facility_id: '',
            MSH3: '',
            MSH4: '',
            MSH5: '',
            MSH6: '',
            MSH22: '',
            RXA11: '',
        }
        render(<Verify destinationById={data} value={data} />);
        expect(screen.getAllByText('existingUsername').length).toBe(2);
    });
});