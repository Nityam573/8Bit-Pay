// React import removed - not needed in modern React
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { AssetProvider } from './contexts/ProductContext';
import { WalletProvider } from './contexts/WalletContext';
import { config } from './config/wagmi';

import { Header } from './components/Header';
import Marketplace from './views/Marketplace';
import ProductListing from './views/ProductListing';
import Profile from './views/Profile';

import '@rainbow-me/rainbowkit/styles.css';
import './App.css';

// Create a query client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletProvider>
            <AssetProvider>
              <Router>
                <div className="app">
                  <Header />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Marketplace />} />
                      <Route path="/product-listing" element={<ProductListing />} />
                      <Route path="/profile" element={<Profile />} />
                    </Routes>
                  </main>
                </div>
              </Router>
            </AssetProvider>
          </WalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;