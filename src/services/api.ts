import { supabase } from '../config/supabase';
import type { Product } from '../config/supabase';
import { x402PaymentService } from './x402PaymentService';
import type { ListingPaymentData } from './x402PaymentService';

// API service with Supabase integration and x402 payment verification

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GetProductsResponse {
  success: boolean;
  products: Product[];
}

export interface PurchaseResponse {
  success: boolean;
  sessionId: string;
  message?: string;
}

export interface CreateProductResponse {
  success: boolean;
  product?: Product;
  paymentRequired?: boolean;
  error?: string;
}

// Listing fee configuration
const LISTING_FEE_USD = 0.10;

// Removed unused walletClient variable

export const api = {
  async getProducts(params?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<GetProductsResponse> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('payment_verified', true) // Only show products with verified listing payments
        .order('created_at', { ascending: false });

      if (params?.category) {
        query = query.eq('category', params.category);
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      if (params?.offset) {
        query = query.range(params.offset, (params.offset || 0) + (params.limit || 10) - 1);
      }

      const { data: products, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        return {
          success: false,
          products: [],
        };
      }

      return {
        success: true,
        products: products || [],
      };
    } catch (error) {
      console.error('Error in getProducts:', error);
      return {
        success: false,
        products: [],
      };
    }
  },

  async getProductDetails(productId: string): Promise<{ success: boolean; product?: Product }> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', productId)
        .eq('payment_verified', true) // Only return products with verified payments
        .single();

      if (error || !product) {
        return {
          success: false,
        };
      }

      return {
        success: true,
        product,
      };
    } catch (error) {
      console.error('Error fetching product details:', error);
      return {
        success: false,
      };
    }
  },

  async purchaseProduct(
    productId: string,
    buyerWallet: string
  ): Promise<PurchaseResponse> {
    try {
      // Get product details from Supabase
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_id', productId)
        .eq('payment_verified', true)
        .single();

      if (error || !product) {
        throw new Error('Product not found');
      }

      // In a real implementation, this would handle the actual payment through x402
      // For now, we'll just simulate a successful purchase
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Record the purchase in the database
      await supabase.from('purchases').insert([
        {
          product_id: productId,
          buyer_wallet: buyerWallet,
          seller_wallet: product.seller_wallet,
          amount: product.price,
          status: 'completed',
        },
      ]);

      return {
        success: true,
        sessionId,
        message: `Successfully purchased ${product.title}`,
      };
    } catch (error) {
      console.error('Purchase failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Purchase failed');
    }
  },

  async createProduct(
    productData: Omit<Product, 'product_id' | 'created_at' | 'payment_verified' | 'payment_tx_hash'>,
    walletClient?: any
  ): Promise<CreateProductResponse> {
    try {
      // First, process the listing payment through x402
      if (!walletClient) {
        return {
          success: false,
          paymentRequired: true,
          error: 'Wallet client required for payment processing',
        };
      }

      const paymentData: ListingPaymentData = {
        amount: LISTING_FEE_USD,
        sellerWallet: productData.seller_wallet,
        productTitle: productData.title,
      };

      console.log('Processing listing payment for product:', productData.title);
      const paymentResult = await x402PaymentService.processListingPayment(walletClient, paymentData);

      if (!paymentResult.success) {
        return {
          success: false,
          error: `Listing payment failed: ${paymentResult.error}`,
        };
      }

      // Create the product with payment verification
      const newProduct: Omit<Product, 'created_at'> = {
        ...productData,
        product_id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payment_verified: true,
        payment_tx_hash: paymentResult.txHash,
      };

      // Save product to database
      console.log('✅ Payment successful! Saving product to database:', newProduct);
      console.log('💰 Payment TX Hash:', paymentResult.txHash);

      const { data: insertedProduct, error: insertError } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (insertError) {
        console.error('Database insertion error:', insertError);
        throw new Error(`Failed to save product to database: ${insertError.message}`);
      }

      // Save payment record
      console.log('💾 Saving payment record to database');
      const { error: paymentError } = await supabase
        .from('listing_payments')
        .insert([{
          product_id: newProduct.product_id,
          seller_wallet: productData.seller_wallet,
          tx_hash: paymentResult.txHash,
          amount: LISTING_FEE_USD,
          verified: true,
        }]);

      if (paymentError) {
        console.error('Payment record insertion error:', paymentError);
        // Don't throw error for payment record - product is already saved
      }

      return {
        success: true,
        product: insertedProduct,
      };
    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },

  async getPurchases(walletAddress: string): Promise<{ success: boolean; purchases?: any[] }> {
    try {
      // In a real implementation, this would fetch user's purchase history from Supabase
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('buyer_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchases:', error);
        return {
          success: false,
          purchases: [],
        };
      }

      return {
        success: true,
        purchases: purchases || [],
      };
    } catch (error) {
      console.error('Error in getPurchases:', error);
      return {
        success: false,
        purchases: [],
      };
    }
  },

  async getUserListings(walletAddress: string): Promise<{ success: boolean; products?: Product[] }> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user listings:', error);
        return {
          success: false,
          products: [],
        };
      }

      return {
        success: true,
        products: products || [],
      };
    } catch (error) {
      console.error('Error in getUserListings:', error);
      return {
        success: false,
        products: [],
      };
    }
  },

  async uploadFile(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${file.name}`;

      const { error } = await supabase.storage
        .from('product-files-2')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('File upload error:', error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`,
        };
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('product-files-2')
        .getPublicUrl(fileName);

      return {
        success: true,
        url: publicUrlData.publicUrl,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed',
      };
    }
  },
};

export { LISTING_FEE_USD };
export type { Product };