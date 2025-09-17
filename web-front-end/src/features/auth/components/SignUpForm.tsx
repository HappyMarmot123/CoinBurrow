import { Button } from "@/shared/components/Button";
import { FormField } from "@/shared/components/FormField";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import { SignUpFormInputs } from "@/features/auth/hooks/useSignUpForm";

type SignUpFormProps = {
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  register: UseFormRegister<SignUpFormInputs>;
  errors: FieldErrors<SignUpFormInputs>;
  handleClear: (fieldName: keyof SignUpFormInputs) => void;
  values: SignUpFormInputs;
  submissionError: string | null;
  closeModal: () => void;
};

export const SignUpForm = ({ ...props }: SignUpFormProps) => (
  <article>
    <h2 className="text-4xl font-extrabold mb-2 text-center text-gray-900">
      Sign Up
    </h2>
    <p className="text-center text-gray-600 mb-6">
      Welcome! Create an account to get started
    </p>
    <form onSubmit={props.onSubmit} noValidate>
      <FormField<SignUpFormInputs>
        label="Email"
        name="email"
        type="email"
        register={props.register}
        error={props.errors.email}
        placeholder="Enter your email"
        onClear={props.handleClear}
        value={props.values.email}
        required
      />
      <FormField<SignUpFormInputs>
        label="Username"
        name="username"
        type="text"
        register={props.register}
        error={props.errors.username}
        placeholder="Choose a username"
        onClear={props.handleClear}
        value={props.values.username}
        required
      />
      <FormField<SignUpFormInputs>
        label="Password"
        name="password"
        type="password"
        register={props.register}
        error={props.errors.password}
        placeholder="6-digit numeric password"
        maxLength={6}
        onClear={props.handleClear}
        value={props.values.password}
        isPassword
        required
      />
      {props.submissionError && (
        <p className="text-red-500 text-sm text-center">
          {props.submissionError}
        </p>
      )}
      <div className="flex items-center justify-between mt-8 gap-4">
        <Button
          type="button"
          onClick={props.closeModal}
          className="flex-1/2"
          variant="secondary"
          size="large"
        >
          Close
        </Button>
        <Button
          type="submit"
          className="flex-1/2"
          variant="primaryGreen"
          size="large"
        >
          Create Account
        </Button>
      </div>
    </form>
  </article>
);
