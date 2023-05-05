import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Test from "../pages/test/[id]";

jest.mock("next/router", () => ({
  useRouter: () => ({
    query: { id: "ak" },
  }),
}));

describe("Test page", () => {
  it("should render properly with all buttons", () => {
    render(<Test />);
    expect(screen.getByTestId("CloseIcon")).toBeInTheDocument();
    expect(screen.getByTestId("PrintIcon")).toBeInTheDocument();
    expect(screen.getByTestId("RerunIcon")).toBeInTheDocument();
  });
});
