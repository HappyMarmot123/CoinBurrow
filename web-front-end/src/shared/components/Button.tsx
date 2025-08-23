import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primaryGreen" | "primaryGold" | "secondary";
  size?: "small" | "large";
};

export const Button = ({
  className,
  variant = "secondary",
  size = "small",
  ...props
}: ButtonProps) => {
  const baseStyle =
    "rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  const variantStyles = {
    primaryGreen:
      "bg-[#8cb37a] text-white hover:bg-[#7da06d] focus:ring-[#8cb37a]",
    primaryGold:
      "bg-[#ddb650] text-white hover:bg-[#c7a448] focus:ring-[#ddb650]",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500",
  };
  const sizeStyles = {
    small: "px-4 py-2",
    large: "px-8 py-[0.8rem]",
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
