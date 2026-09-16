import React, { createContext, useContext, useState } from 'react';

interface NavContextType {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  isActionSheetOpen: boolean;
  openActionSheet: () => void;
  closeActionSheet: () => void;
  isShopModalOpen: boolean;
  openShopModal: () => void;
  closeShopModal: () => void;
  isStaffModalOpen: boolean;
  openStaffModal: () => void;
  closeStaffModal: () => void;
}

const NavContext = createContext<NavContextType>({
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  isActionSheetOpen: false,
  openActionSheet: () => {},
  closeActionSheet: () => {},
  isShopModalOpen: false,
  openShopModal: () => {},
  closeShopModal: () => {},
  isStaffModalOpen: false,
  openStaffModal: () => {},
  closeStaffModal: () => {},
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const openActionSheet = () => setIsActionSheetOpen(true);
  const closeActionSheet = () => setIsActionSheetOpen(false);

  const openShopModal = () => setIsShopModalOpen(true);
  const closeShopModal = () => setIsShopModalOpen(false);

  const openStaffModal = () => setIsStaffModalOpen(true);
  const closeStaffModal = () => setIsStaffModalOpen(false);

  return (
    <NavContext.Provider
      value={{
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        isActionSheetOpen,
        openActionSheet,
        closeActionSheet,
        isShopModalOpen,
        openShopModal,
        closeShopModal,
        isStaffModalOpen,
        openStaffModal,
        closeStaffModal,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
