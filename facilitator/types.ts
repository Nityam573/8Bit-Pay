export interface PaymentRequirements {
  scheme: string;
  network: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxAmountRequired: string;
  maxTimeoutSeconds?: number;
  asset?: string;
  extra?: Record<string, any>;
  outputSchema?: Record<string, any>;
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

export interface VerifyRequest {
  paymentPayloadBase64?: string;
}

export interface VerifyResponse {
  success: boolean;
  errors?: string[];
}