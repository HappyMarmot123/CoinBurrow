import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { useLoginMutation } from "../../../app/core/hooks/useLoginMutation";
import { LoginForm } from "../../../components/organisms/LoginForm";

jest.mock("../../../app/core/hooks/useLoginMutation", () => ({
  useLoginMutation: jest.fn(),
}));

const mockMutate = jest.fn();

describe("LoginForm", () => {
  beforeEach(() => {
    (useLoginMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
    });
    mockMutate.mockClear();
  });

  it("renders email and password fields", () => {
    const { getByPlaceholderText, getByText } = render(<LoginForm />);
    expect(getByPlaceholderText("Enter your email")).toBeTruthy();
    expect(getByPlaceholderText("Enter your password")).toBeTruthy();
    expect(getByText("Log In")).toBeTruthy();
  });

  it("shows validation errors for empty fields", async () => {
    const { getByText, findByText } = render(<LoginForm />);
    fireEvent.press(getByText("Log In"));

    expect(await findByText("Invalid email address.")).toBeTruthy();
    expect(await findByText("Password is required.")).toBeTruthy();
  });

  it("shows validation error for invalid email", async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginForm />
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "invalid-email"
    );
    fireEvent.press(getByText("Log In"));

    expect(await findByText("Invalid email address.")).toBeTruthy();
  });

  it("submits the form with valid data", async () => {
    const onSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginForm onSuccess={onSuccess} />
    );

    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "test@example.com"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your password"),
      "password123"
    );
    fireEvent.press(getByText("Log In"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          email: "test@example.com",
          password: "password123",
        },
        expect.any(Object)
      );
    });

    // Simulate successful mutation
    const successCallback = mockMutate.mock.calls[0][1].onSuccess;
    const mockResponse = {
      mobileToken: "sample-token",
      user: {
        id: "sample-user-id",
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    successCallback(mockResponse);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });
});
