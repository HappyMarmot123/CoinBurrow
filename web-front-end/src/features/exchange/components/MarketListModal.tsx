import { ModalLayout } from "@/shared/ui/ModalLayout";
import { useModal } from "@/shared/contexts/ModalContext";

export const MarketListModal = () => {
  return (
    <ModalLayout>
      <MarketListModalContent />
    </ModalLayout>
  );
};

const MarketListModalContent = () => {
  const { closeModal } = useModal();
  return (
    <div className="bg-gray-700 p-8 rounded-lg w-full max-w-md text-center">
      <h2 className="text-xl mb-4">코인 검색</h2>
      <p className=" flex-grow">여기에 코인 검색 내용이 들어갑니다.</p>
      <button
        onClick={() => closeModal("marketList")}
        className="mt-4 py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 self-end"
      >
        닫기
      </button>
    </div>
  );
};
