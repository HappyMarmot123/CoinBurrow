import React, { useState } from "react";
import {
  UseFormRegister,
  FieldValues,
  Path,
  FieldError,
} from "react-hook-form";
import { XCircle, Eye, EyeOff } from "lucide-react";

{
  /* 
    aria-invalid: 입력값이 유효하지 않을 때 true
    aria-describedby: 입력 필드를 설명하는 요소의 ID 설정정 
    aria-label: 스크린 리더 레이블

    TODO: 부모 컴포넌트에서 다음과 같이 사용하세요.
  
    <FormField<SignUpFormInputs>
        label="Email"
        name="email"
        type="email"
        register={register}
        error={errors.email}
        placeholder="Enter your email"
        onClear={handleClear}
        value={values.email}
        required
    />
  */
}

interface FormFieldProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  error?: FieldError;
  onClear: (name: Path<T>) => void;
  value: string;
  isPassword?: boolean;
}

export const FormField = <T extends FieldValues>({
  label,
  name,
  register,
  error,
  onClear,
  value,
  isPassword = false,
  type = "text",
  ...props
}: FormFieldProps<T>) => {
  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const getEffectiveType = () => {
    if (!isPassword) return type;
    return isPasswordVisible ? "text" : "password";
  };

  const getInputPadding = () => {
    if (isPassword) {
      return hasValue ? "pr-20" : "pr-10";
    }
    return hasValue ? "pr-10" : "pr-4";
  };

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const errorId = error ? `${name}-error` : undefined;
  const hasValue = value && value.length > 0;
  const effectiveType = getEffectiveType();
  const inputPadding = getInputPadding();

  return (
    <div className="mb-3">
      <label
        htmlFor={name}
        className="block text-gray-700 text-sm font-bold mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type={effectiveType}
          {...register(name)}
          className={`shadow-sm appearance-none border border-gray-300 rounded w-full py-3 px-4 text-gray-900 text-lg leading-tight focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition duration-150 ease-in-out ${inputPadding}`}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
          {hasValue && (
            <button
              type="button"
              onClick={() => onClear(name)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label={`Clear ${label}`}
            >
              <XCircle className="h-5 w-5" />
            </button>
          )}
          {isPassword && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>
      <div className="min-h-6  mt-1">
        {error && (
          <p id={errorId} className="text-red-500 !text-base">
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
};
