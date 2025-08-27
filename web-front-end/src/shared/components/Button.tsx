import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primaryGreen" | "primaryGold" | "secondary";
  size?: "small" | "medium" | "large";
};

export const Button = ({
  className,
  variant = "secondary",
  size = "small",
  ...props
}: ButtonProps) => {
  const baseStyle =
    "rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  const variantStyles = {
    primaryGreen:
      "bg-[#5f8d4e] text-white hover:bg-[#4c7a3b] focus:ring-[#5f8d4e]",
    primaryGold:
      "bg-[#ddb650] text-white hover:bg-[#c7a448] focus:ring-[#ddb650]",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500",
  };
  const sizeStyles = {
    small: "px-3 py-1",
    medium: "px-4 py-2 text-lg",
    large: "px-8 py-[0.8rem] text-xl font-semibold",
  };

  return (
    <button
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${
        className || ""
      }`}
      {...props}
    />
  );
};
