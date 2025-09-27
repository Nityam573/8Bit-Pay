import { x402PaymentService, type PurchasePaymentData, type RefundPaymentData, type PaymentResult } from './x402PaymentService';
import { paymentTokens, switchToNetwork, isCorrectNetwork, getCurrentNetworkKey } from '../config/networks';

export type SupportedChain = 'polygon' | 'flow' | 'kadena';

export interface UniversalPaymentData extends PurchasePaymentData {
  chain: SupportedChain;
}

export interface UniversalRefundData extends RefundPaymentData {
  chain: SupportedChain;
}

export class UniversalPaymentRouter {
  /**
   * Process payment on the specified blockchain
   */
  async processPayment(
    walletClient: any,
    paymentData: UniversalPaymentData
  ): Promise<PaymentResult> {
    console.log(`🌐 Processing payment on ${paymentData.chain} chain:`, paymentData);

    // Check if user is on correct network
    const currentChainId = await walletClient.getChainId();
    console.log(`🔍 DEBUG: Current chain ID: ${currentChainId}`);
    console.log(`🔍 DEBUG: Target chain: ${paymentData.chain}`);
    console.log(`🔍 DEBUG: Is correct network: ${isCorrectNetwork(paymentData.chain, currentChainId)}`);

    if (!isCorrectNetwork(paymentData.chain, currentChainId)) {
      console.log(`🔄 Switching to ${paymentData.chain} network...`);
      const switched = await switchToNetwork(paymentData.chain);
      if (!switched) {
        throw new Error(`Failed to switch to ${paymentData.chain} network. Please switch manually.`);
      }
      // Wait a bit for network switch to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log(`✅ Already on correct network for ${paymentData.chain}`);
    }

    console.log(`🔍 DEBUG: Routing payment to chain: ${paymentData.chain}`);

    switch (paymentData.chain) {
      case 'polygon':
        console.log(`🔷 DEBUG: Processing Polygon payment`);
        return this.processPolygonPayment(walletClient, paymentData);

      case 'flow':
        console.log(`🌊 DEBUG: Processing Flow payment`);
        return this.processFlowPayment(walletClient, paymentData);

      case 'kadena':
        console.log(`⛓️ DEBUG: Processing Kadena payment`);
        return this.processKadenaPayment(walletClient, paymentData);

      default:
        throw new Error(`Unsupported chain: ${paymentData.chain}`);
    }
  }

  /**
   * Process refund on the specified blockchain
   */
  async processRefund(
    walletClient: any,
    refundData: UniversalRefundData
  ): Promise<PaymentResult> {
    console.log(`🔄 Processing refund on ${refundData.chain} chain:`, refundData);

    switch (refundData.chain) {
      case 'polygon':
        return this.processPolygonRefund(walletClient, refundData);

      case 'flow':
        return this.processFlowRefund(walletClient, refundData);

      case 'kadena':
        return this.processKadenaRefund(walletClient, refundData);

      default:
        throw new Error(`Unsupported chain: ${refundData.chain}`);
    }
  }

  /**
   * Get supported chains with their status
   */
  getSupportedChains(): Array<{
    id: SupportedChain;
    name: string;
    status: 'active' | 'beta' | 'coming_soon';
    description: string;
    icon: string;
    paymentToken: string;
    exchangeRate: string;
  }> {
    return [
      {
        id: 'polygon',
        name: 'Polygon Amoy',
        status: 'active',
        description: 'x402 gasless USDC payments',
        icon: '🔷',
        paymentToken: 'USDC',
        exchangeRate: '1:1 USD'
      },
      {
        id: 'flow',
        name: 'Flow Testnet',
        status: 'active',
        description: 'Native FLOW token payments',
        icon: '🌊',
        paymentToken: 'FLOW',
        exchangeRate: '1 USD = 0.5 FLOW'
      },
      {
        id: 'kadena',
        name: 'Kadena Testnet',
        status: 'active',
        description: 'Parallel multi-chain KDA payments',
        icon: '⛓️',
        paymentToken: 'KDA',
        exchangeRate: '1 USD = 2 KDA'
      }
    ];
  }

  /**
   * Get optimal chain based on amount and user preferences
   */
  getOptimalChain(amount: number, userPreference?: SupportedChain): SupportedChain {
    // If user has preference and it's available, use it
    if (userPreference && this.isChainAvailable(userPreference)) {
      return userPreference;
    }

    // Default routing logic
    if (amount < 10) return 'flow';     // Small amounts -> Flow (fast/cheap)
    if (amount > 100) return 'kadena';  // Large amounts -> Kadena (parallel processing)
    return 'polygon';                   // Medium amounts -> Polygon (proven x402)
  }

  /**
   * Check if a chain is currently available
   */
  private isChainAvailable(chain: SupportedChain): boolean {
    const supportedChains = this.getSupportedChains();
    const chainInfo = supportedChains.find(c => c.id === chain);
    return chainInfo ? chainInfo.status !== 'coming_soon' : false;
  }

  // =================
  // Polygon Implementation (existing x402)
  // =================
  private async processPolygonPayment(
    walletClient: any,
    paymentData: PurchasePaymentData
  ): Promise<PaymentResult> {
    return x402PaymentService.processPurchasePayment(walletClient, paymentData);
  }

  private async processPolygonRefund(
    walletClient: any,
    refundData: RefundPaymentData
  ): Promise<PaymentResult> {
    return x402PaymentService.processRefundPayment(walletClient, refundData);
  }

  // =================
  // Flow Implementation (Native FLOW payments)
  // =================
  private async processFlowPayment(
    walletClient: any,
    paymentData: PurchasePaymentData
  ): Promise<PaymentResult> {
    console.log('🌊 Processing Flow payment with native FLOW tokens...');

    try {
      const tokenInfo = paymentTokens.flow;
      const account = walletClient.account;

      if (!account) {
        throw new Error('No account connected');
      }

      // Convert USD price to FLOW (mock exchange rate: 1 USD = 0.5 FLOW)
      const flowAmount = paymentData.amount * 0.5;
      const valueInWei = BigInt(Math.floor(flowAmount * Math.pow(10, tokenInfo.decimals)));

      console.log(`💰 Sending ${flowAmount} FLOW to ${paymentData.sellerWallet}`);

      // Send native FLOW token transfer
      const txHash = await walletClient.sendTransaction({
        to: paymentData.sellerWallet,
        value: valueInWei,
        data: '0x', // Simple transfer
      });

      console.log(`✅ Flow payment sent: ${txHash}`);

      return {
        success: true,
        txHash: txHash,
      };
    } catch (error) {
      console.error('Flow payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Flow payment failed',
      };
    }
  }

  private async processFlowRefund(
    walletClient: any,
    refundData: RefundPaymentData
  ): Promise<PaymentResult> {
    console.log('🌊 Processing Flow refund via Flow Actions...');

    await this.simulateChainDelay(800, 1500);

    return {
      success: true,
      txHash: `flow_refund_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    };
  }

  // =================
  // Kadena Implementation (Parallel Chain Processing)
  // =================
  private async processKadenaPayment(
    walletClient: any,
    paymentData: PurchasePaymentData
  ): Promise<PaymentResult> {
    console.log('⛓️ Processing Kadena payment via parallel chains...');

    try {
      const tokenInfo = paymentTokens.kadena;

      // Convert USD to KDA (mock exchange rate: 1 USD = 2 KDA)
      const kdaAmount = paymentData.amount * 2;

      console.log(`💰 Processing ${kdaAmount} KDA payment across multiple Kadena chains...`);

      // Simulate Kadena's parallel chain processing
      const chains = [0, 1, 2]; // Use 3 parallel chains
      const amountPerChain = kdaAmount / chains.length;

      console.log(`🔗 Splitting payment: ${amountPerChain} KDA per chain`);

      // Process on multiple chains in parallel (simulation)
      const chainPromises = chains.map(async (chainId) => {
        console.log(`⛓️ Chain ${chainId}: Processing ${amountPerChain} KDA...`);
        await this.simulateChainProcessing(chainId, amountPerChain);
        return `chain_${chainId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      });

      const chainTxHashes = await Promise.all(chainPromises);
      const mainTxHash = `kadena_multichain_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      console.log(`✅ Kadena parallel payment completed:`, {
        mainTx: mainTxHash,
        chainTxs: chainTxHashes,
        totalAmount: kdaAmount,
        chainsUsed: chains.length
      });

      return {
        success: true,
        txHash: mainTxHash,
      };
    } catch (error) {
      console.error('Kadena payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Kadena payment failed',
      };
    }
  }

  private async processKadenaRefund(
    walletClient: any,
    refundData: RefundPaymentData
  ): Promise<PaymentResult> {
    console.log('⛓️ Processing Kadena refund via parallel chains...');

    await this.simulateChainDelay(600, 1200);

    return {
      success: true,
      txHash: `kadena_refund_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
    };
  }

  // =================
  // Helper Methods
  // =================
  private async simulateChainDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async simulateChainProcessing(chainId: number, amount: number): Promise<void> {
    console.log(`⛓️ Chain ${chainId} processing $${amount}...`);
    await this.simulateChainDelay(500, 1000);
    console.log(`⛓️ Chain ${chainId} completed`);
  }
}

// Export singleton instance
export const universalPaymentRouter = new UniversalPaymentRouter();