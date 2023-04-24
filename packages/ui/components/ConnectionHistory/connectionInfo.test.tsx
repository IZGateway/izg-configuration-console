import React from 'react';
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ConnectionInfo from './connectionInfo';

const destinationById = {
    dest_uri: "www.test.com",
    dest_type: {
      type: "test",
    },
    jurisdiction: {
      description: "unitTest",
    },
    status: {
      status: "Connected"
    },
    username: "test",
    password: "test",
    facility_id: "facilityId",
    MSH3: "MSH3",
    MSH4: "MSH4",
    MSH5: "MSH5",
    MSH6: "MSH6",
    MSH22: "MSH7",
    RXA11: "MSH8",
  }

  const nullValuesOfDestination = {
    dest_uri: "",
    dest_type: {
      type: "",
    },
    jurisdiction: {
      description: "",
    },
    status: {
      status: ""
    },
    username: "",
    password: "",
    facility_id: "",
    MSH3: "",
    MSH4: "",
    MSH5: "",
    MSH6: "",
    MSH22: "",
    RXA11: "",
  }


describe('Connection info', () => {
  it('should show information about connection as passed in', () => {
    render(
      <ConnectionInfo destinationById={destinationById} />
    );
    expect(screen.getByText("www.test.com")).toBeInTheDocument();
    expect(screen.getByText("test")).toBeInTheDocument();
    expect(screen.getByText("unitTest")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  })

  it('should still render even if information passed in as empty values', () => {
    render(
      <ConnectionInfo destinationById={nullValuesOfDestination} />
    );
    expect(screen.getByText("Connection Info")).toBeInTheDocument();
  })
})