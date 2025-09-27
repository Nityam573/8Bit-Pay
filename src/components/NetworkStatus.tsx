import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getCurrentNetworkKey, supportedNetworks } from '../config/networks';

export function NetworkStatus() {
  const { isConnected, chainId } = useWallet();

  if (!isConnected || !chainId) {
    return null;
  }

  const currentNetworkKey = getCurrentNetworkKey(chainId);
  const currentNetwork = currentNetworkKey ? supportedNetworks[currentNetworkKey] : null;

  const getNetworkIcon = (networkKey: string | null) => {
    switch (networkKey) {
      case 'polygon': return '🔷';
      case 'flow': return '🌊';
      case 'kadena': return '⛓️';
      default: return '❓';
    }
  };

  const getNetworkStatus = () => {
    if (!currentNetwork) {
      return {
        icon: '⚠️',
        name: 'Unsupported Network',
        status: 'error' as const
      };
    }

    return {
      icon: getNetworkIcon(currentNetworkKey),
      name: currentNetwork.chainName,
      status: 'connected' as const
    };
  };

  const networkStatus = getNetworkStatus();

  return (
    <div className={`network-status ${networkStatus.status}`}>
      <span className="network-icon">{networkStatus.icon}</span>
      <span className="network-name">{networkStatus.name}</span>
    </div>
  );
}