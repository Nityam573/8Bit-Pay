import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAssets } from '../contexts/ProductContext';
import { AssetAccessModal } from '../components/ProductAccessModal';
import { api } from '../services/api';

export default function Profile() {
  const { isConnected, address } = useWallet();
  const { purchasedAssets } = useAssets();
  const [accessingAsset, setAccessingAsset] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!isConnected || !address) return;

      try {
        setLoadingPurchases(true);
        const response = await api.getPurchases(address);
        if (response.success) {
          setPurchases(response.purchases || []);
        }
      } catch (error) {
        console.error('Failed to fetch purchases:', error);
      } finally {
        setLoadingPurchases(false);
      }
    };

    fetchPurchases();
  }, [isConnected, address]);

  const handleAccessAsset = (asset: any) => {
    setAccessingAsset(asset);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isConnected) {
    return (
      <div className="profile">
        <div className="page-header">
          <h2>Profile</h2>
          <p>View your account information and purchased assets</p>
        </div>
        <div className="connect-prompt">
          <p>🔗 Connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="page-header">
        <h2>Your Profile</h2>
        <p>Manage your account and access your digital assets</p>
      </div>

      <div className="profile-content">
        {/* Wallet Information */}
        <div className="profile-section">
          <h3>💼 Wallet Information</h3>
          <div className="wallet-info">
            <div className="info-item">
              <label>Status:</label>
              <span className="status-connected">✅ Connected</span>
            </div>
            <div className="info-item">
              <label>Wallet Address:</label>
              <span className="wallet-address">{address}</span>
            </div>
          </div>
        </div>

        {/* My Assets */}
        <div className="profile-section">
          <h3>📦 My Digital Assets ({purchasedAssets.length})</h3>
          {purchasedAssets.length === 0 ? (
            <div className="no-assets">
              <p>📭 You haven't purchased any assets yet</p>
              <p>Visit the marketplace to discover and purchase digital products!</p>
            </div>
          ) : (
            <div className="my-assets-grid">
              {purchasedAssets.map((asset) => (
                <div key={asset.product_id} className="my-asset-card">
                  <div className="asset-header">
                    <div className="asset-emoji">
                      {asset.category === 'Image' ? '🖼️' :
                       asset.category === 'Data' ? '📊' :
                       asset.category === 'AI Modal' ? '🤖' : '📄'}
                    </div>
                    <div className="asset-title">
                      <h4>{asset.title}</h4>
                      <p>{asset.description}</p>
                    </div>
                  </div>
                  <div className="asset-meta">
                    <div className="purchase-info">
                      <span>💰 Purchased for: ${asset.price.toFixed(2)}</span>
                      <span>📅 Date: {formatDate(asset.purchaseDate || asset.created_at)}</span>
                      <span>🏷️ Category: {asset.category}</span>
                    </div>
                    <button
                      className="access-asset-btn"
                      onClick={() => handleAccessAsset(asset)}
                    >
                      📁 Access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="profile-section">
          <h3>💳 Recent Transactions</h3>
          {loadingPurchases ? (
            <div className="loading-container">
              <div className="loading-spinner">🔄</div>
              <p>Loading transaction history...</p>
            </div>
          ) : purchases.length === 0 && purchasedAssets.length === 0 ? (
            <div className="no-data">
              <p>No transaction history available</p>
            </div>
          ) : (
            <div className="transactions-list">
              {purchasedAssets.map((asset, index) => (
                <div key={asset.product_id} className="transaction-card">
                  <div className="transaction-icon">💳</div>
                  <div className="transaction-details">
                    <div className="transaction-asset">{asset.title}</div>
                    <div className="transaction-meta">
                      <span>📅 {formatDate(asset.purchaseDate || asset.created_at)}</span>
                      <span>🏷️ {asset.category}</span>
                    </div>
                  </div>
                  <div className="transaction-amount">${asset.price.toFixed(2)}</div>
                  <div className="transaction-status">✅ Completed</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="profile-section">
          <h3>⚡ Quick Actions</h3>
          <div className="quick-actions">
            <button
              className="action-btn"
              onClick={() => window.location.href = '/'}
            >
              🛒 Browse Marketplace
            </button>
            <button
              className="action-btn"
              onClick={() => window.location.href = '/product-listing'}
            >
              📝 List New Product
            </button>
            <button
              className="action-btn"
              onClick={() => {
                if (address) {
                  navigator.clipboard.writeText(address);
                  alert('Wallet address copied to clipboard!');
                }
              }}
            >
              📋 Copy Wallet Address
            </button>
          </div>
        </div>
      </div>

      {accessingAsset && (
        <AssetAccessModal
          asset={accessingAsset}
          onClose={() => setAccessingAsset(null)}
        />
      )}
    </div>
  );
}