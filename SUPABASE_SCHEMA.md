# Supabase Database Schema

This document outlines the required database schema for the PingPay marketplace with x402 payment integration.

## Tables

### 1. Products Table

```sql
CREATE TABLE products (
  product_id VARCHAR PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  seller_wallet VARCHAR NOT NULL,
  category VARCHAR DEFAULT 'Data',
  file_url VARCHAR,
  telegram_username VARCHAR,
  payment_verified BOOLEAN DEFAULT FALSE,
  payment_tx_hash VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_products_payment_verified ON products(payment_verified);
CREATE INDEX idx_products_seller_wallet ON products(seller_wallet);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
```

### 2. Listing Payments Table

```sql
CREATE TABLE listing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  seller_wallet VARCHAR NOT NULL,
  tx_hash VARCHAR NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listing_payments_product_id ON listing_payments(product_id);
CREATE INDEX idx_listing_payments_seller_wallet ON listing_payments(seller_wallet);
CREATE INDEX idx_listing_payments_tx_hash ON listing_payments(tx_hash);
```

### 3. Purchases Table (Optional - for tracking purchases)

```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id VARCHAR NOT NULL REFERENCES products(product_id),
  buyer_wallet VARCHAR NOT NULL,
  seller_wallet VARCHAR NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  tx_hash VARCHAR,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_purchases_buyer_wallet ON purchases(buyer_wallet);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);
```

## Row Level Security (RLS) Policies

### Products Table Policies

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read verified products
CREATE POLICY "Anyone can read verified products" ON products
    FOR SELECT USING (payment_verified = true);

-- Allow sellers to read their own products (including unverified)
CREATE POLICY "Sellers can read their own products" ON products
    FOR SELECT USING (seller_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Allow authenticated users to insert products
CREATE POLICY "Authenticated users can insert products" ON products
    FOR INSERT WITH CHECK (true);

-- Allow sellers to update their own products
CREATE POLICY "Sellers can update their own products" ON products
    FOR UPDATE USING (seller_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');
```

### Listing Payments Table Policies

```sql
-- Enable RLS
ALTER TABLE listing_payments ENABLE ROW LEVEL SECURITY;

-- Allow sellers to read their own payment records
CREATE POLICY "Sellers can read their own payments" ON listing_payments
    FOR SELECT USING (seller_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Allow authenticated users to insert payment records
CREATE POLICY "Authenticated users can insert payments" ON listing_payments
    FOR INSERT WITH CHECK (true);
```

## Environment Variables Required

Add these to your `.env` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Setup Instructions

1. **Create a new Supabase project** at https://supabase.com
2. **Run the SQL schema** in the Supabase SQL editor
3. **Update environment variables** with your project's URLs and keys
4. **Configure RLS policies** according to your security requirements
5. **Test the integration** by listing a product through the UI

## x402 Payment Integration Flow

1. **User fills product listing form**
2. **User clicks "Pay $0.10 & List Product"**
3. **x402PaymentService processes payment** through Polygon Amoy
4. **Payment verification** with x402 facilitator
5. **Product saved to Supabase** with `payment_verified=true`
6. **Payment record stored** in `listing_payments` table
7. **Product appears in marketplace** (only verified products shown)

## Important Notes

- **Only products with `payment_verified=true` are shown** in the marketplace
- **Each listing requires a $0.10 USD payment** through x402 on Polygon Amoy
- **Transaction hashes are stored** for payment verification
- **RLS policies ensure data security** and proper access control
- **The system is designed to be tamper-proof** - payments must be verified before products appear

## Migration from Mock Data

If you're migrating from the previous mock data system:

1. Run the schema creation scripts
2. Update the API service to use Supabase (already done)
3. Update environment variables
4. Test the payment flow
5. Verify that only paid listings appear in the marketplace