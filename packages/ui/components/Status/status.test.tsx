import React from 'react';
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Status from './index';

describe('Status of a connection', () => {
  it('should show Connected if it is passed as Connected', () => {
    render(
      <Status status={{
        status: "Connected"
      }} color={true} />
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
  })

  it('should show Not Connected if it is passed as null', () => {
    render(
      <Status status={{
        status: ""
      }} color={true} />
    );
    expect(screen.getByText("Not Connected")).toBeInTheDocument();
  })

  it('should show Not Connected if it is passed as anything other than Connected', () => {
    render(
      <Status status={{
        status: "XYZ"
      }} color={true} />
    );
    expect(screen.getByText("Not Connected")).toBeInTheDocument();
  })


})