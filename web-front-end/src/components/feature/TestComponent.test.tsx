import React from "react";
import { render, screen } from "@testing-library/react";
import TestComponent from "./TestComponent";
import useSWR from "swr";

jest.mock("swr");

const useSWRMock = useSWR as jest.Mock;

describe("TestComponent", () => {
  it("renders loading state initially", () => {
    useSWRMock.mockReturnValue({ data: undefined, error: undefined });
    render(<TestComponent />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders data when fetch is successful", () => {
    const mockData = {
      name: "swr",
      description: "React Hooks for Data Fetching",
      stargazers_count: 1000,
    };
    useSWRMock.mockReturnValue({ data: mockData, error: undefined });
    render(<TestComponent />);
    expect(screen.getByText("Repo: swr")).toBeInTheDocument();
    expect(
      screen.getByText("Description: React Hooks for Data Fetching")
    ).toBeInTheDocument();
    expect(screen.getByText("Stars: 1000")).toBeInTheDocument();
  });

  it("renders error message when fetch fails", () => {
    useSWRMock.mockReturnValue({
      data: undefined,
      error: new Error("Failed to load"),
    });
    render(<TestComponent />);
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });
});
