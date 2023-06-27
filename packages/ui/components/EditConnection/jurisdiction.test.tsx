import React from 'react';
import { render } from '@testing-library/react';
import Jurisdiction from './jurisdiction';


describe('Jurisdiction component', () => {
    it('renders without throwing any errors', () => {
        const data = {
            dest_uri: '',
            dest_type: {
                type: '',
            },
            jurisdiction: {
                description: '',
            },
            status: {
                status: '',
            },
            username: '',
            password: '',
            facility_id: '',
            MSH3: '',
            MSH4: '',
            MSH5: '',
            MSH6: '',
            MSH22: '',
            RXA11: '',
        }
        expect(() => {
            render(<Jurisdiction destinationById={data} />);
        }).not.toThrow();
    });

});