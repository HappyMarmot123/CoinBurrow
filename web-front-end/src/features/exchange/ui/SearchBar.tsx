import React from "react";
import { useModal } from "@/shared/contexts/ModalContext";
import { Search } from "lucide-react";
import { MarketListModal } from "../components/MarketListModal";
import { ModalProvider } from "@/shared/contexts/ModalContext";

export const SearchBar = () => {
  return (
    <ModalProvider>
      <SearchBarContent />
    </ModalProvider>
  );
};

const SearchBarContent = () => {
  const { openModal, isModalOpen } = useModal();

  return (
    <div className="p-4 bg-gray-700 rounded-lg">
      <div
        onClick={() => openModal("marketList")}
        className="flex items-center w-full py-2 px-4 bg-gray-800 text-gray-400 rounded-md cursor-pointer hover:bg-gray-900"
      >
        <Search className="h-5 w-5 mr-2" />
        <span>코인 검색</span>
      </div>

      {isModalOpen("marketList") && <MarketListModal />}
    </div>
  );
};
