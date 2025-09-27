# 8Bit Pay - Crypto Marketplace with x402 Payments

8Bit Pay is a decentralized marketplace for digital assets built on Polygon Amoy testnet, featuring x402 payment protocol integration for seamless USDC transactions.

## Features

- **x402 Payment Integration**: Secure payments using EIP-3009 transferWithAuthorization
- **Polygon Amoy Testnet**: Built on Ethereum Layer 2 for fast, low-cost transactions
- **USDC Payments**: Native USDC support for listing fees and purchases
- **Digital Asset Marketplace**: Buy and sell digital products, data, images, and AI models
- **Wallet Integration**: Connect with MetaMask and other Web3 wallets via RainbowKit
- **Supabase Backend**: Secure data storage and user management

## Technologies Used

- **Frontend**: React 19 + TypeScript + Vite
- **Blockchain**: Polygon Amoy Testnet, Viem, Wagmi
- **Payments**: x402 Protocol, EIP-3009, USDC
- **Backend**: Supabase (PostgreSQL)
- **Styling**: CSS3 with modern responsive design

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask or compatible Web3 wallet
- Polygon Amoy testnet MATIC for gas fees
- USDC on Polygon Amoy for payments

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 8bitpay-react
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

5. Start the x402 facilitator:
```bash
cd facilitator
npm start
```

## Environment Variables

```env
# x402 Facilitator
VITE_FACILITATOR_URL=http://localhost:5401
VITE_PAYMENT_ADDRESS=0x82886a663c3691f6e8E4B4194CF863De1C2c9cb4

# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## x402 Payment Flow

1. **Product Listing**: Users pay $0.1 USDC listing fee via x402
2. **Payment Authorization**: EIP-712 signature for transferWithAuthorization
3. **Facilitator Processing**: x402 facilitator verifies and settles payment
4. **Database Storage**: Only verified payments create marketplace listings

## Network Configuration

- **Chain**: Polygon Amoy (80002)
- **USDC Contract**: `0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582`
- **RPC URL**: `https://rpc-amoy.polygon.technology`

## Database Schema

The project uses Supabase with the following tables:
- `products` - Digital asset listings
- `listing_payments` - x402 payment records
- `purchases` - User purchase history

Run the SQL schema from `supabase-schema.sql` to set up your database.

## Verifying x402 Payments

To verify payments are using x402 protocol on Polygon Amoy Explorer:

1. Check transaction method: `transferWithAuthorization`
2. Verify sender: Facilitator address (`0x462E99ddc1670B5E2718978f0E6164B68FDbEc37`)
3. Look for events: `AuthorizationUsed` + `Transfer`

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Start x402 facilitator
cd facilitator && npm start
```

## License

MIT License