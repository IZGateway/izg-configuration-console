import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Manage from "../pages/manage/index";
import { act } from "react-dom/test-utils";
import { MockedProvider } from "@apollo/react-testing";
import { FETCH_ALL_DESTINATIONS } from "../lib/queries/fetch";

const mocks = [
  {
    request: {
      query: FETCH_ALL_DESTINATIONS,
    },
    result: {
      data: {
        allDestinations: [
          {
            dest_id: "1",
            dest_uri: "www.google.com",
            dest_version: "2014",
            signed_mou: 0,
            dest_type: {
              type: "TEST",
            },
            jurisdiction: {
              description: "",
              name: "",
            },
            status: {
              status: "",
              detail: "",
              diagnostics: "",
              retry_strategy: "",
              ran_at: "",
            },
          },
        ],
      },
    },
  },
];

describe("Manage page", () => {
  it("should render properly in a loading state", () => {
    render(
      <MockedProvider mocks={mocks}>
        <Manage />
      </MockedProvider>
    );
    expect(screen.getByText("Loading your connections...")).toBeInTheDocument();
  });
  it("should render properly after loading state", async () => {
    const { getByText, queryByText, getByRole, getAllByRole } = render(
      <MockedProvider mocks={mocks}>
        <Manage />
      </MockedProvider>
    );
    expect(getByText("Loading your connections...")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        queryByText("Loading your connections...")
      ).not.toBeInTheDocument();
    });
    expect(getByRole("grid")).toBeInTheDocument();
  });
});
