import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface Asset {
  product_id: string;
  title: string;
  description: string;
  price: number;
  seller_wallet: string;
  category: string;
  file_url?: string;
  telegram_username?: string;
  created_at: string;
}

interface PurchasedAsset extends Asset {
  sessionId: string;
  purchaseDate: Date;
  accessExpiresAt: Date;
}

interface AssetContextType {
  purchasedAssets: PurchasedAsset[];
  purchaseAsset: (asset: Asset, sessionId: string) => void;
  isPurchased: (productId: string) => boolean;
  accessAsset: (productId: string) => PurchasedAsset | null;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({ children }: { children: ReactNode }) {
  const [purchasedAssets, setPurchasedAssets] = useState<PurchasedAsset[]>([]);

  const purchaseAsset = (asset: Asset, sessionId: string) => {
    const purchaseDate = new Date();
    const accessExpiresAt = new Date(purchaseDate.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const purchasedAsset: PurchasedAsset = {
      ...asset,
      sessionId,
      purchaseDate,
      accessExpiresAt,
    };

    setPurchasedAssets(prev => [...prev, purchasedAsset]);
  };

  const isPurchased = (productId: string): boolean => {
    const asset = purchasedAssets.find(a => a.product_id === productId);
    if (!asset) return false;

    // Check if access has expired
    return new Date() < asset.accessExpiresAt;
  };

  const accessAsset = (productId: string): PurchasedAsset | null => {
    const asset = purchasedAssets.find(a => a.product_id === productId);
    if (!asset) return null;

    // Check if access has expired
    if (new Date() >= asset.accessExpiresAt) {
      return null;
    }

    return asset;
  };

  const value = {
    purchasedAssets,
    purchaseAsset,
    isPurchased,
    accessAsset,
  };

  return (
    <AssetContext.Provider value={value}>
      {children}
    </AssetContext.Provider>
  );
}

export function useAssets() {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
}