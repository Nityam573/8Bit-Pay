import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { api, LISTING_FEE_USD } from '../services/api';

export default function ProductListing() {
  const { isConnected, address, walletClient } = useWallet();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Data',
    file: null as File | null,
    telegramUsername: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.title || !formData.description || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      setIsProcessingPayment(true);
      setPaymentStep('processing');
      setUploadProgress(0);

      if (!walletClient) {
        throw new Error('Wallet client not available. Please reconnect your wallet.');
      }

      // Step 1: Process x402 listing payment
      console.log(`Processing listing payment of $${LISTING_FEE_USD} through x402...`);

      const productData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        seller_wallet: address,
        category: formData.category,
        file_url: '', // Will be set after file upload
        telegram_username: formData.telegramUsername || '@unknown',
      };

      // Update progress
      setUploadProgress(25);

      // Step 2: Create product with payment verification
      console.log('Creating product with payment verification...');
      const response = await api.createProduct(productData, walletClient);

      if (!response.success) {
        setPaymentStep('failed');
        throw new Error(response.error || 'Failed to process listing payment');
      }

      setUploadProgress(50);
      setPaymentStep('completed');

      // Step 3: Upload file if provided
      let fileUrl = '';
      if (formData.file && response.product) {
        console.log('Uploading file...');
        // Simulate file upload progress
        const uploadInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(uploadInterval);
              return 90;
            }
            return prev + 5;
          });
        }, 200);

        // In a real implementation, you would upload the file to a storage service
        await new Promise(resolve => setTimeout(resolve, 2000));
        clearInterval(uploadInterval);
        fileUrl = `https://example.com/files/${formData.file.name}`;

        // Update product with file URL (you might want to create an updateProduct API method)
        console.log('File uploaded successfully:', fileUrl);
      }

      setUploadProgress(100);

      alert(
        `🎉 Product "${formData.title}" listed successfully!\n\n` +
        `💰 Listing fee of ${LISTING_FEE_USD} USDC was paid.\n` +
        `🔗 Transaction: ${response.product?.payment_tx_hash}\n\n` +
        `✅ Your product is now live in the marketplace!`
      );

      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        category: 'Data',
        file: null,
        telegramUsername: '',
      });
      const fileInput = document.getElementById('file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Listing failed:', error);
      setPaymentStep('failed');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('payment') || errorMessage.includes('USDC') || errorMessage.includes('transfer')) {
        alert(
          `💳 USDC Transfer Failed: ${errorMessage}\n\n` +
          `❌ Could not transfer ${LISTING_FEE_USD} USDC to complete the listing.\n\n` +
          `✅ Please ensure:\n` +
          `• You have at least ${LISTING_FEE_USD} USDC in your wallet\n` +
          `• You're connected to Polygon Amoy testnet\n` +
          `• Your wallet has enough MATIC for gas fees\n` +
          `• You approve the transaction when prompted\n\n` +
          `🔗 USDC Contract: 0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582`
        );
      } else {
        alert(`❌ Failed to list product: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
      setIsProcessingPayment(false);
      setUploadProgress(0);
      setPaymentStep('idle');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="product-listing">
      <div className="page-header">
        <h2>List Your Product on 8Bit Pay</h2>
        <p>Sell your digital assets with x402 payment verification</p>
      </div>

      {!isConnected && (
        <div className="connect-prompt">
          <p>🔗 Connect your wallet to start listing products</p>
        </div>
      )}

      {isConnected && (
        <div className="listing-container">
          <div className="listing-form-container">
            <form className="listing-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Product Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter a descriptive title for your product"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what you're selling and its value"
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="price">Price (USD) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="Data">Data</option>
                  <option value="Image">Image</option>
                  <option value="AI Modal">AI Modal</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="file">Upload File</label>
                <input
                  type="file"
                  id="file"
                  onChange={handleFileChange}
                  accept="*/*"
                />
                {formData.file && (
                  <div className="file-info">
                    <p>📎 Selected file: {formData.file.name}</p>
                    <p>Size: {formatFileSize(formData.file.size)}</p>
                    <p>Type: {formData.file.type || 'Unknown'}</p>
                  </div>
                )}
                <p className="file-size-hint">
                  Max file size: 100MB. Supported formats: Images, Documents, Data files, etc.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="telegramUsername">Telegram Username</label>
                <input
                  type="text"
                  id="telegramUsername"
                  name="telegramUsername"
                  value={formData.telegramUsername}
                  onChange={handleInputChange}
                  placeholder="@yourhandle"
                />
              </div>

              {(uploading || isProcessingPayment) && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <div className="payment-status">
                    {paymentStep === 'processing' && (
                      <p>🔄 Transferring ${LISTING_FEE_USD} USDC...</p>
                    )}
                    {paymentStep === 'completed' && (
                      <p>✅ USDC payment completed successfully!</p>
                    )}
                    {paymentStep === 'failed' && (
                      <p>❌ USDC transfer failed. Please try again.</p>
                    )}
                    {paymentStep === 'idle' && uploading && (
                      <p>{uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Finalizing listing...'}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="listing-fee-info">
                <p><strong>📋 Listing Fee:</strong> ${LISTING_FEE_USD} USDC</p>
                <p>💰 Direct USDC transfer to payment address</p>
                <p>📍 <strong>USDC Contract:</strong> 0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582</p>
                <p><em>⚠️ Ensure you have at least ${LISTING_FEE_USD} USDC in your wallet.</em></p>
                {!isConnected && (
                  <p className="warning">🔗 Connect your wallet to proceed with listing.</p>
                )}
                {isConnected && !walletClient && (
                  <p className="warning">⚠️ Wallet client not ready. Please refresh the page.</p>
                )}
              </div>

              <button
                type="submit"
                className="list-asset-btn"
                disabled={uploading || !isConnected || !walletClient || isProcessingPayment}
              >
                {isProcessingPayment
                  ? 'Transferring USDC...'
                  : uploading
                    ? 'Listing Product...'
                    : `Pay ${LISTING_FEE_USD} USDC & List Product`}
              </button>
            </form>
          </div>

          <div className="preview-container">
            <h3>Preview</h3>
            <div className="asset-preview">
              <div className="preview-image">
                <div className="preview-emoji">📦</div>
              </div>
              <div className="preview-info">
                <h4>{formData.title || 'Product Title'}</h4>
                <p>{formData.description || 'Product description will appear here...'}</p>
                <div className="preview-details">
                  <span className="preview-price">
                    ${formData.price ? parseFloat(formData.price).toFixed(2) : '0.00'}
                  </span>
                  <span className="preview-seller">
                    By: {address ? `${address.slice(0, 8)}...` : 'Your wallet'}
                  </span>
                </div>
                <div className="category-tag">{formData.category}</div>
                {formData.file && (
                  <div className="preview-file">
                    📎 {formData.file.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}