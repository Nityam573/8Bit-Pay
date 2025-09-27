import type { Chain } from 'viem';

// Flow EVM Testnet Configuration
export const flowTestnet: Chain = {
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'FLOW',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'FlowScan',
      url: 'https://evm-testnet.flowscan.io',
    },
  },
  testnet: true,
};

// Kadena Testnet Configuration (Chain 1)
export const kadenaTestnet: Chain = {
  id: 5920, // Kadena chain 1
  name: 'Kadena Chainweb EVM Testnet 20',
  nativeCurrency: {
    decimals: 12,
    name: 'KDA',
    symbol: 'KDA',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc'],
    },
    public: {
      http: ['https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Kadena Explorer',
      url: 'http://chain-20.evm-testnet-blockscout.chainweb.com',
    },
  },
  testnet: true,
};

// Network switching utilities
export interface NetworkConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[];
}

export const supportedNetworks: Record<string, NetworkConfig> = {
  polygon: {
    chainId: 80002,
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/'],
    iconUrls: ['https://wallet-asset.matic.network/img/tokens/matic.svg'],
  },
  flow: {
    chainId: 545,
    chainName: 'Flow EVM Testnet',
    nativeCurrency: {
      name: 'FLOW',
      symbol: 'FLOW',
      decimals: 18,
    },
    rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
    blockExplorerUrls: ['https://evm-testnet.flowscan.io'],
    iconUrls: ['https://cryptologos.cc/logos/flow-flow-logo.svg'],
  },
  kadena: {
    chainId: 5920, // Kadena Chainweb EVM Testnet 20
    chainName: 'Kadena Chainweb EVM Testnet 20',
    nativeCurrency: {
      name: 'KDA',
      symbol: 'KDA',
      decimals: 12,
    },
    rpcUrls: ['https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc'],
    blockExplorerUrls: ['http://chain-20.evm-testnet-blockscout.chainweb.com'],
    iconUrls: ['https://cryptologos.cc/logos/kadena-kda-logo.svg'],
  },
};

// Payment token configurations for each network
export const paymentTokens = {
  polygon: {
    symbol: 'USDC',
    decimals: 6,
    address: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    name: 'USD Coin',
  },
  flow: {
    symbol: 'FLOW',
    decimals: 18,
    address: 'native', // Native FLOW token
    name: 'Flow Token',
  },
  kadena: {
    symbol: 'KDA',
    decimals: 12,
    address: 'native', // Native KDA token
    name: 'Kadena Token',
  },
};

// Network switching function
export async function switchToNetwork(networkKey: string): Promise<boolean> {
  if (!window.ethereum) {
    alert('Please install MetaMask or another Web3 wallet');
    return false;
  }

  const network = supportedNetworks[networkKey];
  if (!network) {
    console.error(`Unsupported network: ${networkKey}`);
    return false;
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${network.chainId.toString(16)}` }],
    });
    return true;
  } catch (switchError: any) {
    // If network doesn't exist, add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${network.chainId.toString(16)}`,
              chainName: network.chainName,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: network.blockExplorerUrls,
              iconUrls: network.iconUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        return false;
      }
    } else {
      console.error('Failed to switch network:', switchError);
      return false;
    }
  }
}

// Get current network info
export function getCurrentNetworkKey(chainId: number): string | null {
  for (const [key, network] of Object.entries(supportedNetworks)) {
    if (network.chainId === chainId) {
      return key;
    }
  }
  return null;
}

// Check if user is on correct network for selected chain
export function isCorrectNetwork(selectedChain: string, currentChainId: number): boolean {
  const network = supportedNetworks[selectedChain];
  return network ? network.chainId === currentChainId : false;
}