import React from "react";

export const Footer = () => {
  return (
    <footer className="bg-white">
      <div className="container mx-auto py-4 px-4 text-center text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} CoinBurrow. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
