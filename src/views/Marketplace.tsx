import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAssets, type Asset } from '../contexts/ProductContext';
import { api, type Product } from '../services/api';
import { AssetAccessModal } from '../components/ProductAccessModal';

export default function Marketplace() {
  const { isConnected, address, walletClient } = useWallet();
  const { purchaseAsset, isPurchased, accessAsset } = useAssets();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [accessingAsset, setAccessingAsset] = useState<Asset | null>(null);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewingDetails, setViewingDetails] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setFetchingProducts(true);
        const response = await api.getProducts({
          category: selectedCategory || undefined,
          limit: 50,
          offset: 0,
        });
        if (!response.success) {
          alert('Failed to load products from server');
          return;
        }
        const mappedAssets: Asset[] = response.products.map((product: Product) => ({
          product_id: product.product_id,
          title: product.title,
          description: product.description,
          price: product.price,
          seller_wallet: product.seller_wallet,
          category: product.category || 'data',
          file_url: product.file_url,
          telegram_username: product.telegram_username || '@unknown',
          created_at: product.created_at,
        }));
        setAssets(mappedAssets);
      } catch (error) {
        alert('Failed to load products. Please try again.');
      } finally {
        setFetchingProducts(false);
      }
    };
    fetchProducts();
  }, [selectedCategory]);

  const handlePurchase = async (asset: Asset) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!walletClient) {
      alert('Wallet client not available. Please reconnect your wallet.');
      return;
    }

    setLoading(true);
    try {
      console.log(`Processing purchase of "${asset.title}" for $${asset.price} USDC through x402...`);

      const result = await api.purchaseProduct(asset.product_id, address, walletClient);
      purchaseAsset(asset, result.sessionId);

      alert(
        `🎉 Purchase Successful!\n\n` +
        `✅ "${asset.title}" purchased for $${asset.price} USDC\n` +
        `💰 Payment sent directly to seller via x402\n` +
        `📱 You now have access to this product!\n\n` +
        `Check your Profile to access your purchased items.`
      );

      // Refresh the assets list to update purchase status
      const response = await api.getProducts({
        category: selectedCategory || undefined,
        limit: 50,
        offset: 0,
      });
      if (response.success) {
        const mappedAssets: Asset[] = response.products.map((product: Product) => ({
          product_id: product.product_id,
          title: product.title,
          description: product.description,
          price: product.price,
          seller_wallet: product.seller_wallet,
          category: product.category || 'data',
          file_url: product.file_url,
          telegram_username: product.telegram_username || '@unknown',
          created_at: product.created_at,
        }));
        setAssets(mappedAssets);
      }
    } catch (error) {
      console.error('Purchase failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('payment') || errorMessage.includes('USDC') || errorMessage.includes('transfer')) {
        alert(
          `💳 USDC Transfer Failed: ${errorMessage}\n\n` +
          `❌ Could not transfer $${asset.price} USDC to complete the purchase.\n\n` +
          `✅ Please ensure:\n` +
          `• You have at least $${asset.price} USDC in your wallet\n` +
          `• You're connected to Polygon Amoy testnet\n` +
          `• Your wallet has enough MATIC for gas fees\n` +
          `• You approve the transaction when prompted\n\n` +
          `🔗 USDC Contract: 0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582`
        );
      } else {
        alert(`❌ Purchase failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccess = (asset: Asset) => {
    if (isPurchased(asset.product_id)) {
      setAccessingAsset(asset);
    } else {
      alert('Asset not found in your collection.');
    }
  };

  const handleViewDetails = async (productId: string) => {
    try {
      setViewingDetails(productId);
      const response = await api.getProductDetails(productId);
      if (response.success && response.product) {
        const product = response.product;
        alert(`Product Details:\n\nTitle: ${product.title}\nDescription: ${product.description}\nPrice: $${product.price}\nCategory: ${product.category || 'N/A'}\nSeller: ${product.seller_wallet.slice(0, 10)}...\nContact: ${product.telegram_username || 'N/A'}\nCreated: ${new Date(product.created_at).toLocaleDateString()}`);
      } else {
        alert('Failed to load product details');
      }
    } catch (error) {
      alert('Failed to load product details');
    } finally {
      setViewingDetails(null);
    }
  };

  const getActionButton = (asset: Asset) => {
    const owned = isPurchased(asset.product_id);
    const isViewingThis = viewingDetails === asset.product_id;
    return (
      <div className="action-buttons">
        <button className="details-btn" onClick={() => handleViewDetails(asset.product_id)} disabled={isViewingThis}>
          {isViewingThis ? 'Loading...' : 'View Details'}
        </button>
        {owned ? (
          <button className="access-btn" onClick={() => handleAccess(asset)}>Access Product</button>
        ) : (
          <button className="purchase-btn" onClick={() => handlePurchase(asset)} disabled={!isConnected || loading}>
            {loading ? 'Processing...' : `Purchase $${asset.price}`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="marketplace">
      <div className="page-header">
        <h2>8Bit Pay Marketplace</h2>
        <p>Discover and purchase digital assets with x402 payments</p>
      </div>
      {!isConnected && (
        <div className="connect-prompt">
          <p>🔗 Connect your wallet to start purchasing assets</p>
        </div>
      )}
      <div className="filter-section">
        <label htmlFor="category-filter">Filter by Category:</label>
        <select id="category-filter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="category-filter">
          <option value="">All Categories</option>
          <option value="Image">Image</option>
          <option value="Data">Data</option>
          <option value="AI Modal">AI Modal</option>
        </select>
      </div>
      {fetchingProducts ? (
        <div className="loading-container">
          <div className="loading-spinner">🔄</div>
          <p>Loading products from database...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="empty-state">
          <p>📭 No products available yet. Be the first to list a product!</p>
        </div>
      ) : (
        <div className="assets-grid">
          {assets.map((asset) => (
            <div key={asset.product_id} className={`asset-card ${isPurchased(asset.product_id) ? 'owned' : ''}`}>
              {isPurchased(asset.product_id) && <div className="ownership-badge">✅ Owned</div>}
              <div className="asset-info">
                <h3>{asset.title}</h3>
                <p className="asset-description">{asset.description}</p>
                <div className="asset-details">
                  <span className="asset-price">${asset.price.toFixed(2)}</span>
                  <span className="asset-seller">By: {asset.seller_wallet.slice(0, 8)}...</span>
                </div>
                <div className="asset-category">
                  <span className="category-tag">{asset.category}</span>
                  {asset.telegram_username && <span className="telegram-contact">📱 {asset.telegram_username}</span>}
                </div>
                {getActionButton(asset)}
              </div>
            </div>
          ))}
        </div>
      )}
      {accessingAsset && <AssetAccessModal asset={accessingAsset} onClose={() => setAccessingAsset(null)} />}
    </div>
  );
}