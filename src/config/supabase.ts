import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evonhjdjojzwjlotvdoy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2b25oamRqb2p6d2psb3R2ZG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTg1MzYsImV4cCI6MjA3NDQ3NDUzNn0.b-JCLMAKP3sUqwmQqIEPSB2s1e-XJ8nbIRICawsaY_A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  product_id: string;
  title: string;
  description: string;
  price: number;
  seller_wallet: string;
  category?: string;
  file_url?: string;
  telegram_username?: string;
  created_at: string;
  payment_tx_hash?: string; // x402 payment transaction hash for listing verification
  payment_verified: boolean; // whether the listing payment has been verified
}

export interface ListingPayment {
  id: string;
  product_id: string;
  seller_wallet: string;
  tx_hash: string;
  amount: number;
  verified: boolean;
  created_at: string;
}