import { Suspense } from "react";
import { LoadingSpinner } from "@/shared/components/LoadingSpinner";
import { ErrorBoundary } from "react-error-boundary";

export const ModalLayout = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={` 
        ${className}
        fixed inset-0 bg-black/50 flex justify-center items-center z-40 `}
    >
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<SuspenseFallback />}>{children}</Suspense>
      </ErrorBoundary>
    </div>
  );
};

const SuspenseFallback = () => {
  return (
    <div className="bg-white p-8 rounded-lg w-full max-w-md text-center">
      <LoadingSpinner />
      <p className="text-gray-600 mt-4">QR Code Loading...</p>
    </div>
  );
};

const ErrorFallback = () => {
  return (
    <div className="bg-white p-8 rounded-lg w-full max-w-md text-center">
      <h3 className="text-lg font-semibold text-red-600 mb-2">
        에러가 발생했습니다
      </h3>
      <p className="text-gray-600 mb-4">잠시 후 다시 시도해주세요.</p>
    </div>
  );
};
