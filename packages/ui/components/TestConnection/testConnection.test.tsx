import React from 'react';
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import TestsList from './testsList';

describe('Test History', () => {
  it('should not show error message for PASS status of tests', () => {
    render(
      <TestsList testResults={[{
        name:"Unit tests",
        status:"PASS",
        message:"error message"
      }]}
      destination={"dev"}
      destinationType={"test"}
      jurisdictionUrl={"www.random.com"}/>
    );
    expect(screen.getByText("Unit tests")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.queryByText("error message")).not.toBeInTheDocument();
  })

  it('should show error message for FAIL status of tests', () => {
    render(
      <TestsList testResults={[{
        name:"Unit tests",
        status:"FAIL",
        message:"error message"
      }]}
      destination={"dev"}
      destinationType={"test"}
      jurisdictionUrl={"www.random.com"}/>
    );
    expect(screen.getByText("Unit tests")).toBeInTheDocument();
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(screen.queryByText("error message")).toBeInTheDocument();
  })

  it('should show warning message for WARNING status of tests', () => {
    render(
      <TestsList testResults={[{
        name:"Unit tests",
        status:"WARNING",
        message:"warning message"
      }]}
      destination={"dev"}
      destinationType={"test"}
      jurisdictionUrl={"www.random.com"}/>
    );
    expect(screen.getByText("Unit tests")).toBeInTheDocument();
    expect(screen.getByText("WARNING")).toBeInTheDocument();
    expect(screen.queryByText("warning message")).toBeInTheDocument();
  })

  
  it('should not show error message for SKIPPED status of tests', () => {
    render(
      <TestsList testResults={[{
        name:"Unit tests",
        status:"SKIPPED",
        message:"error message"
      }]}
      destination={"dev"}
      destinationType={"test"}
      jurisdictionUrl={"www.random.com"}/>
    );
    expect(screen.getByText("Unit tests")).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
    expect(screen.getByText("Cannot test Further on failure")).toBeInTheDocument();
    expect(screen.queryByText("error message")).not.toBeInTheDocument();
  })

  it('should show not show error if none of the test results are passed', () => {
    render(
      <TestsList testResults={[]}
      destination={"dev"}
      destinationType={"test"}
      jurisdictionUrl={"www.random.com"}/>
    );
    expect(screen.getByText("Oh No! We ran into a problem")).not.toBeInTheDocument();
  })

})