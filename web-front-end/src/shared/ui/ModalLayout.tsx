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
      {children}
    </div>
  );
};
