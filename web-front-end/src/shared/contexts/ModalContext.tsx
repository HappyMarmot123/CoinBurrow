"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

export type ModalName = "signup" | "qrForm";

type ModalState = {
  [key in ModalName]?: boolean;
};

interface ModalContextType {
  isModalOpen: (modalName: ModalName) => boolean;
  openModal: (modalName: ModalName) => void;
  closeModal: (modalName: ModalName) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [modals, setModals] = useState<ModalState>({});

  const openModal = (modalName: ModalName) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName: ModalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
  };

  const isModalOpen = (modalName: ModalName) => !!modals[modalName];

  return (
    <ModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
