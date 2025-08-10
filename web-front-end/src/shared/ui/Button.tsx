import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "primaryGreen" | "primaryGold";
};

export const Button = ({
  className,
  variant = "primary",
  ...props
}: ButtonProps) => {
  const baseStyle =
    "px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500",
    primaryGreen:
      "bg-[#8cb37a] text-white hover:bg-[#7da06d] focus:ring-[#8cb37a]",
    primaryGold:
      "bg-[#ddb650] text-white hover:bg-[#c7a448] focus:ring-[#ddb650]",
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${className || ""}`}
      {...props}
    />
  );
};
