import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SignUpModal } from "./SignUpModal";
import { ModalProvider, useModal } from "@/shared/contexts/ModalContext";

global.fetch = jest.fn();
global.alert = jest.fn();

jest.mock("@/shared/contexts/ModalContext", () => ({
  ...jest.requireActual("@/shared/contexts/ModalContext"),
  useModal: jest.fn(),
}));

const mockCloseModal = jest.fn();

const renderWithProvider = (ui: React.ReactElement) => {
  (useModal as jest.Mock).mockReturnValue({
    closeModal: mockCloseModal,
  });
  return render(<ModalProvider>{ui}</ModalProvider>);
};

describe("SignUpModal", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (alert as jest.Mock).mockClear();
    mockCloseModal.mockClear();
    (useModal as jest.Mock).mockClear();
  });

  it("should render the sign up form correctly", () => {
    renderWithProvider(<SignUpModal />);
    expect(
      screen.getByRole("heading", { name: /sign up/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/6-digit numeric password/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("should show validation errors for invalid input", async () => {
    renderWithProvider(<SignUpModal />);

    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "invalid-email" },
    });
    fireEvent.input(screen.getByPlaceholderText(/6-digit numeric password/i), {
      target: { value: "123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/invalid email address/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Password must be 6 characters./i)
    ).toBeInTheDocument();
  });

  it("should submit the form successfully", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Success" }),
    });

    renderWithProvider(<SignUpModal />);

    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/username/i), {
      target: { value: "testuser" },
    });
    fireEvent.input(screen.getByPlaceholderText(/6-digit numeric password/i), {
      target: { value: "123456" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/auth/signup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          username: "testuser",
          password: "123456",
        }),
      });
      expect(alert).toHaveBeenCalledWith("Sign up successful!");
      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });
  });

  it("should show an alert on failed submission", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "User already exists" }),
    });

    renderWithProvider(<SignUpModal />);

    fireEvent.input(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.input(screen.getByLabelText(/username/i), {
      target: { value: "testuser" },
    });
    fireEvent.input(screen.getByPlaceholderText(/6-digit numeric password/i), {
      target: { value: "123456" },
    });

    fireEvent.submit(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Sign up failed: User already exists");
      expect(mockCloseModal).not.toHaveBeenCalled();
    });
  });

  it("should close the modal when the close button is clicked", () => {
    renderWithProvider(<SignUpModal />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(mockCloseModal).toHaveBeenCalledTimes(1);
  });
});
