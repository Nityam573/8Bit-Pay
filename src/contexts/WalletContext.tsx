import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAccount, useWalletClient } from 'wagmi';

interface WalletContextType {
  isConnected: boolean;
  address?: string;
  walletClient?: any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const value = {
    isConnected,
    address,
    walletClient,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}