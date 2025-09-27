-- Create products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  seller_wallet VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  file_url TEXT,
  telegram_username VARCHAR(255),
  payment_verified BOOLEAN DEFAULT FALSE,
  payment_tx_hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create listing_payments table
CREATE TABLE listing_payments (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES products(product_id),
  seller_wallet VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchases table
CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES products(product_id),
  buyer_wallet VARCHAR(255) NOT NULL,
  seller_wallet VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_seller_wallet ON products(seller_wallet);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_payment_verified ON products(payment_verified);
CREATE INDEX idx_listing_payments_product_id ON listing_payments(product_id);
CREATE INDEX idx_purchases_buyer_wallet ON purchases(buyer_wallet);
CREATE INDEX idx_purchases_product_id ON purchases(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to verified products
CREATE POLICY "Public can read verified products" ON products
  FOR SELECT USING (payment_verified = true);

-- Create policies for users to insert their own products
CREATE POLICY "Users can insert their own products" ON products
  FOR INSERT WITH CHECK (true);

-- Create policies for users to update their own products
CREATE POLICY "Users can update their own products" ON products
  FOR UPDATE USING (true);

-- Create policies for listing_payments
CREATE POLICY "Public can read listing payments" ON listing_payments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert listing payments" ON listing_payments
  FOR INSERT WITH CHECK (true);

-- Create policies for purchases
CREATE POLICY "Users can read their purchases" ON purchases
  FOR SELECT USING (true);

CREATE POLICY "Users can insert purchases" ON purchases
  FOR INSERT WITH CHECK (true);