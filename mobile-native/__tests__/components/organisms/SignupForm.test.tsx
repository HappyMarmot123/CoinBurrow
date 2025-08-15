import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { useSignupMutation } from "../../../app/core/hooks/useAuthMutation";
import { SignupForm } from "../../../components/organisms/SignupForm";

jest.mock("../../../app/core/hooks/useAuthMutation", () => ({
  useSignupMutation: jest.fn(),
}));

const mockMutate = jest.fn();

describe("SignupForm", () => {
  beforeEach(() => {
    (useSignupMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
    });
    mockMutate.mockClear();
  });

  it("renders username, email, and password fields", () => {
    const { getByPlaceholderText, getByText } = render(<SignupForm />);
    expect(getByPlaceholderText("Enter your username")).toBeTruthy();
    expect(getByPlaceholderText("Enter your email")).toBeTruthy();
    expect(getByPlaceholderText("Enter your password")).toBeTruthy();
    expect(getByText("Sign Up")).toBeTruthy();
  });

  it("shows validation errors for empty fields", async () => {
    const { getByText, findByText } = render(<SignupForm />);
    fireEvent.press(getByText("Sign Up"));

    expect(await findByText("Username is required.")).toBeTruthy();
    expect(await findByText("Invalid email address.")).toBeTruthy();
    expect(
      await findByText("Password must be at least 8 characters long.")
    ).toBeTruthy();
  });

  it("shows validation error for invalid email", async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <SignupForm />
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "invalid-email"
    );
    fireEvent.press(getByText("Sign Up"));

    expect(await findByText("Invalid email address.")).toBeTruthy();
  });

  it("submits the form with valid data", async () => {
    const onSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <SignupForm onSuccess={onSuccess} />
    );

    fireEvent.changeText(
      getByPlaceholderText("Enter your username"),
      "testuser"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "test@example.com"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "Password123"
    );
    fireEvent.press(getByText("Sign Up"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          username: "testuser",
          email: "test@example.com",
          password: "Password123",
        },
        expect.any(Object)
      );
    });

    // Simulate successful mutation
    const successCallback = mockMutate.mock.calls[0][1].onSuccess;
    const mockResponse = {
      id: "1",
      username: "testuser",
      email: "test@example.com",
      createdAt: new Date(),
    };
    successCallback(mockResponse);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });
});
