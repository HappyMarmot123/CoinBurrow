import { Loader } from "lucide-react";

export const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <Loader className="animate-spin text-gray-500 h-12 w-12" />
  </div>
);
