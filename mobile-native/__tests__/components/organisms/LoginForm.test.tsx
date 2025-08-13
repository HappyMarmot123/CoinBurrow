import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { LoginForm } from "../../../components/organisms/LoginForm";

describe("LoginForm", () => {
  it("renders email and password fields", () => {
    const { getByPlaceholderText, getByText } = render(<LoginForm />);

    expect(getByPlaceholderText("이메일을 입력하세요")).toBeTruthy();
    expect(getByPlaceholderText("비밀번호를 입력하세요")).toBeTruthy();
    expect(getByText("로그인")).toBeTruthy();
  });

  it("shows validation errors for empty fields", async () => {
    const { getByText, findByText } = render(<LoginForm />);

    fireEvent.press(getByText("로그인"));

    const emailError = await findByText("유효한 이메일을 입력해주세요.");
    const passwordError = await findByText("비밀번호는 6자 이상이어야 합니다.");

    expect(emailError).toBeTruthy();
    expect(passwordError).toBeTruthy();
  });

  it("shows validation error for invalid email", async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginForm />
    );

    fireEvent.changeText(
      getByPlaceholderText("이메일을 입력하세요"),
      "invalid-email"
    );
    fireEvent.press(getByText("로그인"));

    const emailError = await findByText("유효한 이메일을 입력해주세요.");
    expect(emailError).toBeTruthy();
  });

  it("submits the form with valid data", async () => {
    const onSuccess = jest.fn();
    const { getByPlaceholderText, getByText } = render(
      <LoginForm onSuccess={onSuccess} />
    );

    fireEvent.changeText(
      getByPlaceholderText("이메일을 입력하세요"),
      "test@example.com"
    );
    fireEvent.changeText(
      getByPlaceholderText("비밀번호를 입력하세요"),
      "password123"
    );
    fireEvent.press(getByText("로그인"));

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      },
      { timeout: 2000 }
    );
  });
});
