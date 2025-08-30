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
    <section className="p-4">
      <article
        onClick={() => openModal("marketList")}
        className="flex items-center w-full py-2 px-4 bg-gray-700 text-gray-400 rounded-md cursor-pointer shadow-lg"
      >
        <Search className="h-5 w-5 mr-2" />
        <span>코인 검색</span>
      </article>

      {isModalOpen("marketList") && <MarketListModal />}
    </section>
  );
};
