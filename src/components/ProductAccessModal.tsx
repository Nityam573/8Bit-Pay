import React, { useState, useEffect } from 'react';
import { type Asset } from '../contexts/ProductContext';
import { api } from '../services/api';

interface AssetAccessModalProps {
  asset: Asset;
  onClose: () => void;
}

export function AssetAccessModal({ asset, onClose }: AssetAccessModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    const loadAssetContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, this would fetch the actual content
        // For now, we'll simulate loading content
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock content based on asset type
        let mockContent = '';
        switch (asset.category.toLowerCase()) {
          case 'image':
            mockContent = `🖼️ Digital Image: ${asset.title}\n\nThis is a mock representation of the digital image content. In a real implementation, this would display the actual image file.`;
            break;
          case 'data':
            mockContent = `📊 Dataset: ${asset.title}\n\nSample data:\n- Record 1: Value A\n- Record 2: Value B\n- Record 3: Value C\n\nTotal records: 1,000+\n\nThis is a mock representation of the dataset. In a real implementation, you would have access to download the actual data files.`;
            break;
          case 'ai modal':
            mockContent = `🤖 AI Model: ${asset.title}\n\nModel specifications:\n- Type: Text Generation\n- Parameters: 7B\n- Training data: Web text\n- Use cases: Content creation, summarization\n\nThis is a mock representation of the AI model. In a real implementation, you would have access to the model files and documentation.`;
            break;
          default:
            mockContent = `📄 Digital Content: ${asset.title}\n\nContent description: ${asset.description}\n\nThis is the actual content you purchased. Thank you for your purchase!`;
        }

        setContent(mockContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    loadAssetContent();
  }, [asset]);

  const handleDownload = () => {
    // In a real implementation, this would trigger an actual download
    const blob = new Blob([content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: asset.title,
        text: `Check out this digital asset: ${asset.title}`,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`Check out this digital asset: ${asset.title} - ${window.location.href}`);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="asset-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{asset.title}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="modal-loading">
              <div className="loading-spinner">🔄</div>
              <p>Loading your content...</p>
            </div>
          )}

          {error && (
            <div className="modal-error">
              <p>❌ Error: {error}</p>
            </div>
          )}

          {content && (
            <div className="asset-content">
              <div className="text-content">
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {content}
                </pre>
              </div>
            </div>
          )}
        </div>

        {content && (
          <div className="modal-footer">
            <div className="asset-actions">
              <button className="action-btn primary" onClick={handleDownload}>
                📥 Download Content
              </button>
              <button className="action-btn secondary" onClick={handleShare}>
                📤 Share
              </button>
            </div>
            <p className="access-note">
              You have access to this content for 24 hours from purchase.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}