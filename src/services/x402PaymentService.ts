import { parseUnits, encodeFunctionData, keccak256, toBytes } from 'viem';
import { polygonAmoy } from 'viem/chains';

// USDC contract address on Polygon Amoy
const USDC_CONTRACT_ADDRESS = '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582';
const USDC_DECIMALS = 6;

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface ListingPaymentData {
  amount: number; // in USD
  sellerWallet: string;
  productTitle: string;
}

export interface PurchasePaymentData {
  amount: number; // in USD (product price)
  sellerWallet: string;
  buyerWallet: string;
  productId: string;
  productTitle: string;
}

export interface RefundPaymentData {
  amount: number; // in USD (refund amount)
  sellerWallet: string; // sender (refunding party)
  buyerWallet: string; // receiver (refund recipient)
  purchaseId: string;
  productTitle: string;
  reason?: string;
}

export interface PaymentPayload {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  verifyingContract: string;
  chainId: number;
  signature: string;
}

export interface PaymentRequirement {
  scheme: string;
  network: string;
  resource: string;
  payTo: string;
  maxAmountRequired: string;
  description?: string;
}

export class X402PaymentService {
  private facilitatorUrl: string;
  private paymentReceiverAddress: string;

  constructor() {
    this.facilitatorUrl = import.meta.env.VITE_FACILITATOR_URL || "http://localhost:5401";
    this.paymentReceiverAddress = import.meta.env.VITE_PAYMENT_ADDRESS || "0x82886a663c3691f6e8E4B4194CF863De1C2c9cb4";
  }

  /**
   * Process payment for purchasing a product through x402 protocol
   * This creates a payment requirement and processes it through the facilitator
   */
  async processPurchasePayment(
    walletClient: any,
    paymentData: PurchasePaymentData
  ): Promise<PaymentResult> {
    try {
      console.log('Processing x402 purchase payment...', paymentData);

      // Convert USD amount to USDC
      const usdcAmount = parseUnits(paymentData.amount.toString(), USDC_DECIMALS);

      // Create payment requirement - buyer pays seller directly
      const paymentRequirement: PaymentRequirement = {
        scheme: 'exact',
        network: 'polygon-amoy',
        resource: `purchase:${paymentData.productId}`,
        payTo: paymentData.sellerWallet, // Payment goes to seller
        maxAmountRequired: usdcAmount.toString(),
        description: `Purchase of "${paymentData.productTitle}" for $${paymentData.amount}`,
      };

      console.log('Purchase payment requirement:', paymentRequirement);

      // Create and sign payment authorization
      const paymentPayload = await this.createPaymentAuthorization(
        walletClient,
        paymentRequirement,
        usdcAmount.toString()
      );

      console.log('Purchase payment payload created:', paymentPayload);

      // Submit to x402 facilitator
      const result = await this.submitToFacilitator(paymentPayload);

      if (result.success) {
        return {
          success: true,
          txHash: result.transaction,
        };
      } else {
        return {
          success: false,
          error: `x402 facilitator rejected purchase payment: ${result.errors?.join(', ')}`,
        };
      }
    } catch (error) {
      console.error('x402 purchase payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown purchase payment error',
      };
    }
  }

  /**
   * Process refund payment through x402 protocol
   * Seller sends USDC back to buyer for a purchase refund
   */
  async processRefundPayment(
    walletClient: any,
    refundData: RefundPaymentData
  ): Promise<PaymentResult> {
    try {
      console.log('Processing x402 refund payment...', refundData);

      // Convert USD amount to USDC
      const usdcAmount = parseUnits(refundData.amount.toString(), USDC_DECIMALS);

      // Create refund payment requirement - seller pays buyer back
      const paymentRequirement: PaymentRequirement = {
        scheme: 'exact',
        network: 'polygon-amoy',
        resource: `refund:${refundData.purchaseId}`,
        payTo: refundData.buyerWallet, // Refund goes to buyer
        maxAmountRequired: usdcAmount.toString(),
        description: `Refund for "${refundData.productTitle}" - $${refundData.amount}${refundData.reason ? ` (${refundData.reason})` : ''}`,
      };

      console.log('Refund payment requirement:', paymentRequirement);

      // Create and sign payment authorization (seller signs to send refund)
      const paymentPayload = await this.createPaymentAuthorization(
        walletClient,
        paymentRequirement,
        usdcAmount.toString()
      );

      console.log('Refund payment payload created:', paymentPayload);

      // Submit to x402 facilitator
      const result = await this.submitToFacilitator(paymentPayload);

      if (result.success) {
        return {
          success: true,
          txHash: result.transaction,
        };
      } else {
        return {
          success: false,
          error: `x402 facilitator rejected refund payment: ${result.errors?.join(', ')}`,
        };
      }
    } catch (error) {
      console.error('x402 refund payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown refund payment error',
      };
    }
  }

  /**
   * Process payment for listing a product through x402 protocol
   * This creates a payment requirement and processes it through the facilitator
   */
  async processListingPayment(
    walletClient: any,
    paymentData: ListingPaymentData
  ): Promise<PaymentResult> {
    try {
      console.log('Processing x402 payment for listing...', paymentData);

      // Convert USD amount to USDC
      const usdcAmount = parseUnits(paymentData.amount.toString(), USDC_DECIMALS);

      // Create payment requirement
      const paymentRequirement: PaymentRequirement = {
        scheme: 'exact',
        network: 'polygon-amoy',
        resource: `listing:${paymentData.productTitle}`,
        payTo: this.paymentReceiverAddress,
        maxAmountRequired: usdcAmount.toString(),
        description: `Listing fee for ${paymentData.productTitle}`,
      };

      console.log('Payment requirement:', paymentRequirement);

      // Create and sign payment authorization
      const paymentPayload = await this.createPaymentAuthorization(
        walletClient,
        paymentRequirement,
        usdcAmount.toString()
      );

      console.log('Payment payload created:', paymentPayload);

      // Submit to x402 facilitator
      const result = await this.submitToFacilitator(paymentPayload);

      if (result.success) {
        return {
          success: true,
          txHash: result.transaction,
        };
      } else {
        return {
          success: false,
          error: `x402 facilitator rejected payment: ${result.errors?.join(', ')}`,
        };
      }
    } catch (error) {
      console.error('x402 payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown payment error',
      };
    }
  }

  /**
   * Create a payment authorization using x402 protocol
   * This tries EIP-3009 first, falls back to simple authorization if that fails
   */
  private async createPaymentAuthorization(
    walletClient: any,
    requirement: PaymentRequirement,
    value: string
  ): Promise<PaymentPayload> {
    const account = walletClient.account;
    if (!account) {
      throw new Error('No account connected to wallet');
    }

    // Generate nonce
    const nonce = keccak256(toBytes(Date.now().toString() + Math.random().toString()));

    // Set validity window (valid for 10 minutes)
    const now = Math.floor(Date.now() / 1000);
    const validAfter = now;
    const validBefore = now + 600;

    try {
      // Try EIP-3009 TransferWithAuthorization first
      return await this.createEIP3009Authorization(
        walletClient,
        account.address,
        requirement.payTo,
        value,
        validAfter,
        validBefore,
        nonce
      );
    } catch (eip3009Error) {
      console.log('EIP-3009 failed, trying x402 simple authorization...', eip3009Error);

      // Fallback to x402 simple authorization
      return await this.createSimpleAuthorization(
        walletClient,
        account.address,
        requirement.payTo,
        value,
        validAfter,
        validBefore,
        nonce
      );
    }
  }

  /**
   * Create EIP-3009 TransferWithAuthorization payload
   */
  private async createEIP3009Authorization(
    walletClient: any,
    from: string,
    to: string,
    value: string,
    validAfter: number,
    validBefore: number,
    nonce: string
  ): Promise<PaymentPayload> {
    // EIP-712 domain for USDC
    const domain = {
      name: 'USDC', // Try both 'USDC' and 'USD Coin'
      version: '2',
      chainId: polygonAmoy.id,
      verifyingContract: USDC_CONTRACT_ADDRESS,
    };

    // EIP-712 types
    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    };

    console.log('Signing EIP-3009 message:', { domain, types, message });

    const signature = await walletClient.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    });

    return {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
      verifyingContract: USDC_CONTRACT_ADDRESS,
      chainId: polygonAmoy.id,
      signature,
    };
  }

  /**
   * Create simple x402 authorization (fallback)
   */
  private async createSimpleAuthorization(
    walletClient: any,
    from: string,
    to: string,
    value: string,
    validAfter: number,
    validBefore: number,
    nonce: string
  ): Promise<PaymentPayload> {
    // Create a simple message for x402 authorization
    const message = {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    };

    console.log('Signing simple x402 message:', message);

    // Sign the JSON message directly (fallback method)
    const messageString = JSON.stringify(message);
    const signature = await walletClient.signMessage({
      message: messageString,
    });

    return {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
      verifyingContract: USDC_CONTRACT_ADDRESS,
      chainId: polygonAmoy.id,
      signature,
    };
  }

  /**
   * Submit payment payload to x402 facilitator
   */
  private async submitToFacilitator(payload: PaymentPayload): Promise<any> {
    try {
      const payloadJson = JSON.stringify(payload);
      const paymentPayloadBase64 = btoa(payloadJson);

      console.log('Submitting to x402 facilitator:', this.facilitatorUrl);

      // First verify the payment
      const verifyResponse = await fetch(`${this.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': paymentPayloadBase64,
        },
        body: JSON.stringify({ paymentPayloadBase64 }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(`Verification failed: ${errorData.errors?.join(', ')}`);
      }

      const verifyResult = await verifyResponse.json();
      console.log('x402 verification result:', verifyResult);

      if (!verifyResult.success) {
        throw new Error(`Verification failed: ${verifyResult.errors?.join(', ')}`);
      }

      // Then settle the payment
      const settleResponse = await fetch(`${this.facilitatorUrl}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': paymentPayloadBase64,
        },
        body: JSON.stringify({ paymentPayloadBase64 }),
      });

      if (!settleResponse.ok) {
        const errorData = await settleResponse.json();
        throw new Error(`Settlement failed: ${errorData.errors?.join(', ')}`);
      }

      const settleResult = await settleResponse.json();
      console.log('x402 settlement result:', settleResult);

      return settleResult;
    } catch (error) {
      console.error('x402 facilitator submission failed:', error);
      throw error;
    }
  }

  /**
   * Check if a product listing payment is valid
   */
  async isListingPaymentValid(txHash: string): Promise<boolean> {
    try {
      return !!txHash;
    } catch (error) {
      console.error('Payment validation failed:', error);
      return false;
    }
  }

  /**
   * Get the USDC contract address
   */
  getUSDCContractAddress(): string {
    return USDC_CONTRACT_ADDRESS;
  }

  /**
   * Get the payment receiver address
   */
  getPaymentReceiverAddress(): string {
    return this.paymentReceiverAddress;
  }
}

// Export singleton instance
export const x402PaymentService = new X402PaymentService();