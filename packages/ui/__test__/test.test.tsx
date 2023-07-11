import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Test from "../pages/test/[id]";
import CombinedContext, { CombinedContextType } from '../contexts/app';

jest.mock("next/router", () => ({
  useRouter: () => ({
    query: { id: "ak" },
  }),
}));
const mockContextValue: CombinedContextType = {
  pageSize: 5,
  setPageSize: jest.fn(),
  isChangePasswordClicked: true,
  setIsChangePasswordClicked: jest.fn(),
  clearValue: () => jest.fn(),
};


describe("Test page", () => {
  it("should render properly with all buttons", () => {
    render(
      <CombinedContext.Provider value={mockContextValue}>
        <Test />
      </CombinedContext.Provider>);
    expect(screen.getByTestId("CloseIcon")).toBeInTheDocument();
    expect(screen.getByTestId("PrintIcon")).toBeInTheDocument();
    expect(screen.getByTestId("RerunIcon")).toBeInTheDocument();
  });
});
