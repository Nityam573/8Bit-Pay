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
    buyerWallet: string,
    walletClient?: any
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

      // Process x402 purchase payment
      if (!walletClient) {
        throw new Error('Wallet client required for payment processing');
      }

      const purchasePaymentData: import('./x402PaymentService').PurchasePaymentData = {
        amount: product.price,
        sellerWallet: product.seller_wallet,
        buyerWallet: buyerWallet,
        productId: productId,
        productTitle: product.title,
      };

      console.log('Processing purchase payment through x402...', purchasePaymentData);
      const paymentResult = await x402PaymentService.processPurchasePayment(walletClient, purchasePaymentData);

      if (!paymentResult.success) {
        throw new Error(`Purchase payment failed: ${paymentResult.error}`);
      }

      console.log('✅ Purchase payment successful! TX Hash:', paymentResult.txHash);

      // Record the purchase in the database with payment verification
      const { data: insertedPurchase, error: insertError } = await supabase.from('purchases').insert([
        {
          product_id: productId,
          buyer_wallet: buyerWallet,
          seller_wallet: product.seller_wallet,
          amount: product.price,
          status: 'completed',
          payment_verified: true,
          payment_tx_hash: paymentResult.txHash,
        },
      ]).select().single();

      if (insertError) {
        console.error('Failed to save purchase to database:', insertError);
        throw new Error(`Payment succeeded but failed to record purchase: ${insertError.message}`);
      }

      console.log('✅ Purchase saved to database:', insertedPurchase);

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      return {
        success: true,
        sessionId,
        message: `Successfully purchased ${product.title} for $${product.price} USDC`,
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
      console.log('🔍 API: Fetching purchases for wallet:', walletAddress);

      // First, let's check if there are any purchases at all
      const { data: allPurchases, error: allError } = await supabase
        .from('purchases')
        .select('*')
        .eq('buyer_wallet', walletAddress);

      console.log('📊 All purchases for this wallet:', allPurchases);
      console.log('❓ All purchases error:', allError);

      // Fetch user's verified purchase history from Supabase with manual join
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select(`
          *,
          products(
            product_id,
            title,
            description,
            category,
            file_url,
            seller_wallet
          )
        `)
        .eq('buyer_wallet', walletAddress)
        .eq('payment_verified', true) // Only show verified purchases
        .order('created_at', { ascending: false });

      // If the above doesn't work, let's try a different approach
      if (error) {
        console.log('🔄 Trying alternative approach without join...');

        // Get purchases first
        const { data: purchasesOnly, error: purchasesError } = await supabase
          .from('purchases')
          .select('*')
          .eq('buyer_wallet', walletAddress)
          .eq('payment_verified', true)
          .order('created_at', { ascending: false });

        if (purchasesError) {
          throw purchasesError;
        }

        // Get products for each purchase
        if (purchasesOnly && purchasesOnly.length > 0) {
          const productIds = purchasesOnly.map(p => p.product_id);
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('product_id', productIds);

          if (productsError) {
            throw productsError;
          }

          // Manually join the data
          const joinedPurchases = purchasesOnly.map(purchase => ({
            ...purchase,
            products: products?.find(product => product.product_id === purchase.product_id)
          })).filter(purchase => purchase.products); // Only include purchases with valid products

          return {
            success: true,
            purchases: joinedPurchases,
          };
        }

        return {
          success: true,
          purchases: [],
        };
      }

      console.log('✅ Verified purchases with products:', purchases);
      console.log('❌ Verified purchases error:', error);

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

  async requestRefund(
    purchaseId: string,
    buyerWallet: string,
    reason?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get purchase details
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select(`
          *,
          products!inner(
            product_id,
            title,
            seller_wallet
          )
        `)
        .eq('id', purchaseId)
        .eq('buyer_wallet', buyerWallet)
        .eq('payment_verified', true)
        .single();

      if (purchaseError || !purchase) {
        throw new Error('Purchase not found or not verified');
      }

      // Check if already refunded
      if (purchase.status === 'refunded') {
        throw new Error('This purchase has already been refunded');
      }

      // Create refund request record
      const { error: refundError } = await supabase.from('refund_requests').insert([
        {
          purchase_id: purchaseId,
          buyer_wallet: buyerWallet,
          seller_wallet: purchase.products.seller_wallet,
          amount: purchase.amount,
          reason: reason || 'No reason provided',
          status: 'pending',
          product_title: purchase.products.title,
        },
      ]);

      if (refundError) {
        console.error('Failed to create refund request:', refundError);
        throw new Error(`Failed to create refund request: ${refundError.message}`);
      }

      return {
        success: true,
        message: `Refund request submitted for "${purchase.products.title}". The seller will be notified.`,
      };
    } catch (error) {
      console.error('Refund request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit refund request',
      };
    }
  },

  async processRefund(
    refundRequestId: string,
    sellerWallet: string,
    walletClient: any,
    action: 'approve' | 'deny'
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Get refund request details
      const { data: refundRequest, error: refundError } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('id', refundRequestId)
        .eq('seller_wallet', sellerWallet)
        .eq('status', 'pending')
        .single();

      if (refundError || !refundRequest) {
        throw new Error('Refund request not found or not pending');
      }

      if (action === 'deny') {
        // Simply update status to denied
        const { error: updateError } = await supabase
          .from('refund_requests')
          .update({
            status: 'denied',
            processed_at: new Date().toISOString(),
          })
          .eq('id', refundRequestId);

        if (updateError) {
          throw new Error(`Failed to deny refund: ${updateError.message}`);
        }

        return {
          success: true,
          message: 'Refund request has been denied.',
        };
      }

      // Process x402 refund payment
      const refundPaymentData: import('./x402PaymentService').RefundPaymentData = {
        amount: refundRequest.amount,
        sellerWallet: sellerWallet,
        buyerWallet: refundRequest.buyer_wallet,
        purchaseId: refundRequest.purchase_id,
        productTitle: refundRequest.product_title,
        reason: refundRequest.reason,
      };

      console.log('Processing refund payment through x402...', refundPaymentData);
      const paymentResult = await x402PaymentService.processRefundPayment(walletClient, refundPaymentData);

      if (!paymentResult.success) {
        throw new Error(`Refund payment failed: ${paymentResult.error}`);
      }

      console.log('✅ Refund payment successful! TX Hash:', paymentResult.txHash);

      // Update refund request status
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: 'completed',
          refund_tx_hash: paymentResult.txHash,
          processed_at: new Date().toISOString(),
        })
        .eq('id', refundRequestId);

      if (updateError) {
        console.error('Failed to update refund request:', updateError);
        // Don't throw error here - payment succeeded
      }

      // Update original purchase status
      const { error: purchaseUpdateError } = await supabase
        .from('purchases')
        .update({ status: 'refunded' })
        .eq('id', refundRequest.purchase_id);

      if (purchaseUpdateError) {
        console.error('Failed to update purchase status:', purchaseUpdateError);
        // Don't throw error here - payment succeeded
      }

      return {
        success: true,
        message: `Refund of $${refundRequest.amount} USDC processed successfully!`,
      };
    } catch (error) {
      console.error('Process refund failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  },

  async getRefundRequests(walletAddress: string): Promise<{ success: boolean; requests?: any[] }> {
    try {
      // Get refund requests for this wallet (both as buyer and seller)
      const { data: requests, error } = await supabase
        .from('refund_requests')
        .select('*')
        .or(`buyer_wallet.eq.${walletAddress},seller_wallet.eq.${walletAddress}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching refund requests:', error);
        return {
          success: false,
          requests: [],
        };
      }

      return {
        success: true,
        requests: requests || [],
      };
    } catch (error) {
      console.error('Error in getRefundRequests:', error);
      return {
        success: false,
        requests: [],
      };
    }
  },
};

export { LISTING_FEE_USD };
export type { Product };