import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { AssetAccessModal } from '../components/ProductAccessModal';
import { api } from '../services/api';

export default function Profile() {
  const { isConnected, address, walletClient } = useWallet();
  const [accessingAsset, setAccessingAsset] = useState<any>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRefundRequest, setSelectedRefundRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!isConnected || !address) return;

      try {
        setLoadingPurchases(true);
        console.log('🔍 Fetching purchases for address:', address);
        const response = await api.getPurchases(address);
        console.log('📦 Purchases response:', response);
        if (response.success) {
          setPurchases(response.purchases || []);
          console.log('✅ Found', response.purchases?.length || 0, 'verified purchases');
        } else {
          console.error('❌ Failed to fetch purchases:', response);
        }
      } catch (error) {
        console.error('Failed to fetch purchases:', error);
      } finally {
        setLoadingPurchases(false);
      }
    };

    fetchPurchases();
  }, [isConnected, address]);

  useEffect(() => {
    const fetchRefundRequests = async () => {
      if (!isConnected || !address) return;

      try {
        setLoadingRefunds(true);
        const response = await api.getRefundRequests(address);
        if (response.success) {
          setRefundRequests(response.requests || []);
        }
      } catch (error) {
        console.error('Failed to fetch refund requests:', error);
      } finally {
        setLoadingRefunds(false);
      }
    };

    fetchRefundRequests();
  }, [isConnected, address]);

  const handleAccessAsset = (asset: any) => {
    setAccessingAsset(asset);
  };

  const handleRequestRefund = (purchase: any) => {
    setSelectedPurchase(purchase);
    setRefundModalOpen(true);
    setRefundReason('');
  };

  const handleSubmitRefund = async () => {
    if (!selectedPurchase || !address) return;

    try {
      const response = await api.requestRefund(selectedPurchase.id, address, refundReason);

      if (response.success) {
        alert(`✅ ${response.message}`);
        setRefundModalOpen(false);
        setSelectedPurchase(null);
        setRefundReason('');

        // Refresh refund requests
        const refundResponse = await api.getRefundRequests(address);
        if (refundResponse.success) {
          setRefundRequests(refundResponse.requests || []);
        }
      } else {
        alert(`❌ ${response.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to submit refund request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleApproveRefund = async (refundRequest: any) => {
    if (!address || !walletClient) {
      alert('Please ensure your wallet is connected');
      return;
    }

    setProcessingRefund(refundRequest.id);
    try {
      console.log('Processing refund approval for request:', refundRequest.id);
      const response = await api.processRefund(refundRequest.id, address, walletClient, 'approve');

      if (response.success) {
        alert(
          `✅ Refund Approved Successfully!\n\n` +
          `💰 $${refundRequest.amount} USDC has been sent to the buyer\n` +
          `🔗 Transaction: ${response.txHash?.slice(0, 10)}...\n` +
          `📱 The buyer has been notified of the refund`
        );

        // Refresh refund requests
        const refundResponse = await api.getRefundRequests(address);
        if (refundResponse.success) {
          setRefundRequests(refundResponse.requests || []);
        }
      } else {
        alert(`❌ Failed to process refund: ${response.error}`);
      }
    } catch (error) {
      console.error('Refund approval failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Refund approval failed: ${errorMessage}`);
    } finally {
      setProcessingRefund(null);
    }
  };

  const handleRejectRefund = (refundRequest: any) => {
    setSelectedRefundRequest(refundRequest);
    setRejectModalOpen(true);
    setRejectionReason('');
  };

  const handleSubmitRejection = async () => {
    if (!selectedRefundRequest || !address || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingRefund(selectedRefundRequest.id);
    try {
      const response = await api.processRefund(
        selectedRefundRequest.id,
        address,
        walletClient,
        'deny',
        rejectionReason
      );

      if (response.success) {
        alert(
          `✅ Refund Rejected Successfully!\n\n` +
          `📝 Reason: ${rejectionReason}\n` +
          `📱 The buyer has been notified of the rejection`
        );

        setRejectModalOpen(false);
        setSelectedRefundRequest(null);
        setRejectionReason('');

        // Refresh refund requests
        const refundResponse = await api.getRefundRequests(address);
        if (refundResponse.success) {
          setRefundRequests(refundResponse.requests || []);
        }
      } else {
        alert(`❌ Failed to reject refund: ${response.error}`);
      }
    } catch (error) {
      console.error('Refund rejection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Refund rejection failed: ${errorMessage}`);
    } finally {
      setProcessingRefund(null);
    }
  };

  const isSellerForRefund = (refundRequest: any) => {
    return address && refundRequest.seller_wallet &&
           address.toLowerCase() === refundRequest.seller_wallet.toLowerCase();
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
          <h3>📦 My Digital Assets ({purchases.length})</h3>
          {loadingPurchases ? (
            <div className="loading-container">
              <div className="loading-spinner">🔄</div>
              <p>Loading your assets...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="no-assets">
              <p>📭 You haven't purchased any assets yet</p>
              <p>Visit the marketplace to discover and purchase digital products!</p>
              <p><em>Only verified x402 purchases will appear here.</em></p>
            </div>
          ) : (
            <div className="my-assets-grid">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="my-asset-card">
                  <div className="asset-header">
                    <div className="asset-emoji">
                      {purchase.products.category === 'Image' ? '🖼️' :
                       purchase.products.category === 'Data' ? '📊' :
                       purchase.products.category === 'AI Modal' ? '🤖' : '📄'}
                    </div>
                    <div className="asset-title">
                      <h4>{purchase.products.title}</h4>
                      <p>{purchase.products.description}</p>
                    </div>
                  </div>
                  <div className="asset-meta">
                    <div className="purchase-info">
                      <span>💰 Purchased for: ${purchase.amount} USDC</span>
                      <span>📅 Date: {formatDate(purchase.created_at)}</span>
                      <span>🏷️ Category: {purchase.products.category}</span>
                      <span>✅ Payment Verified: x402</span>
                    </div>
                    <div className="asset-actions">
                      <button
                        className="access-asset-btn"
                        onClick={() => handleAccessAsset({
                          product_id: purchase.products.product_id,
                          title: purchase.products.title,
                          description: purchase.products.description,
                          category: purchase.products.category,
                          file_url: purchase.products.file_url,
                          price: purchase.amount
                        })}
                      >
                        📁 Access
                      </button>
                      {purchase.status !== 'refunded' && (
                        <button
                          className="refund-btn"
                          onClick={() => handleRequestRefund(purchase)}
                        >
                          🔄 Request Refund
                        </button>
                      )}
                    </div>
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
          ) : purchases.length === 0 ? (
            <div className="no-data">
              <p>No verified x402 transactions found</p>
              <p><em>Only successful x402 payments will appear here</em></p>
            </div>
          ) : (
            <div className="transactions-list">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="transaction-card">
                  <div className="transaction-icon">💳</div>
                  <div className="transaction-details">
                    <div className="transaction-asset">{purchase.products.title}</div>
                    <div className="transaction-meta">
                      <span>📅 {formatDate(purchase.created_at)}</span>
                      <span>🏷️ {purchase.products.category}</span>
                      <span>🔗 x402 Payment</span>
                      {purchase.payment_tx_hash && (
                        <span>📋 TX: {purchase.payment_tx_hash.slice(0, 10)}...</span>
                      )}
                    </div>
                  </div>
                  <div className="transaction-amount">${purchase.amount} USDC</div>
                  <div className="transaction-status">✅ Verified</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refund Requests */}
        <div className="profile-section">
          <h3>🔄 Refund Requests ({refundRequests.length})</h3>
          {loadingRefunds ? (
            <div className="loading-container">
              <div className="loading-spinner">🔄</div>
              <p>Loading refund requests...</p>
            </div>
          ) : refundRequests.length === 0 ? (
            <div className="no-data">
              <p>No refund requests found</p>
              <p><em>Request refunds from your purchased products above</em></p>
            </div>
          ) : (
            <div className="refund-requests-list">
              {refundRequests.map((request) => (
                <div key={request.id} className="refund-request-card">
                  <div className="refund-icon">
                    {request.status === 'pending' ? '⏳' :
                     request.status === 'completed' ? '✅' :
                     request.status === 'denied' ? '❌' : '🔄'}
                  </div>
                  <div className="refund-details">
                    <div className="refund-product">{request.product_title}</div>
                    <div className="refund-meta">
                      <span>📅 Requested: {formatDate(request.created_at)}</span>
                      <span>💰 Amount: ${request.amount} USDC</span>
                      <span>📝 Reason: {request.reason || 'No reason provided'}</span>
                      {request.seller_wallet && (
                        <span>🏪 From: {request.seller_wallet.slice(0, 10)}...</span>
                      )}
                      {request.buyer_wallet && (
                        <span>👤 To: {request.buyer_wallet.slice(0, 10)}...</span>
                      )}
                      {request.refund_tx_hash && (
                        <span>🔗 TX: {request.refund_tx_hash.slice(0, 10)}...</span>
                      )}
                      {request.status === 'denied' && request.rejection_reason && (
                        <span>❌ Rejection: {request.rejection_reason}</span>
                      )}
                    </div>
                  </div>
                  <div className="refund-status">
                    <span className={`status-${request.status}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    {/* Seller Action Buttons for Pending Requests */}
                    {request.status === 'pending' && isSellerForRefund(request) && (
                      <div className="seller-actions">
                        <button
                          className="approve-refund-btn"
                          onClick={() => handleApproveRefund(request)}
                          disabled={processingRefund === request.id}
                        >
                          {processingRefund === request.id ? '⏳ Processing...' : '✅ Approve'}
                        </button>
                        <button
                          className="reject-refund-btn"
                          onClick={() => handleRejectRefund(request)}
                          disabled={processingRefund === request.id}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                  </div>
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

      {/* Refund Request Modal */}
      {refundModalOpen && selectedPurchase && (
        <div className="modal-overlay">
          <div className="refund-modal">
            <div className="modal-header">
              <h3>Request Refund</h3>
              <button
                className="close-btn"
                onClick={() => setRefundModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="refund-product-info">
                <h4>{selectedPurchase.products.title}</h4>
                <p>Amount: ${selectedPurchase.amount} USDC</p>
                <p>Purchased: {formatDate(selectedPurchase.created_at)}</p>
              </div>
              <div className="refund-reason-section">
                <label htmlFor="refund-reason">Reason for refund (optional):</label>
                <textarea
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please explain why you would like a refund..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="refund-submit-btn"
                onClick={handleSubmitRefund}
              >
                🔄 Submit Refund Request
              </button>
              <button
                className="refund-cancel-btn"
                onClick={() => setRefundModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Refund Modal */}
      {rejectModalOpen && selectedRefundRequest && (
        <div className="modal-overlay">
          <div className="refund-modal">
            <div className="modal-header">
              <h3>Reject Refund Request</h3>
              <button
                className="close-btn"
                onClick={() => setRejectModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="refund-product-info">
                <h4>{selectedRefundRequest.product_title}</h4>
                <p>Amount: ${selectedRefundRequest.amount} USDC</p>
                <p>Requested: {formatDate(selectedRefundRequest.created_at)}</p>
                <p>Buyer Reason: {selectedRefundRequest.reason || 'No reason provided'}</p>
              </div>
              <div className="refund-reason-section">
                <label htmlFor="rejection-reason">Reason for rejection (required):</label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please explain why you are rejecting this refund request..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="reject-submit-btn"
                onClick={handleSubmitRejection}
                disabled={!rejectionReason.trim() || processingRefund === selectedRefundRequest.id}
              >
                {processingRefund === selectedRefundRequest.id ? '⏳ Processing...' : '❌ Reject Refund'}
              </button>
              <button
                className="refund-cancel-btn"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}