export const ModalLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[100]">
      {children}
    </div>
  );
};
