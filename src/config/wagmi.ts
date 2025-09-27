import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy, mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'PingPay x402 Wallet',
  projectId: '3fcc6bba6f1de962d911bb5b5c3dba68', // You should replace this with your own project ID
  chains: [polygonAmoy, mainnet, sepolia],
  ssr: false, // Standard React doesn't use SSR
});