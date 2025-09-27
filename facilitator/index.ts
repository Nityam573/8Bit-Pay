import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { ethers } from 'ethers';
import { PaymentPayload } from './types.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 5401;
const AMOY_RPC_URL = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
// Prefer explicit facilitator key env var
const PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
const REAL_SETTLE = (process.env.REAL_SETTLE || 'true') === 'true';
const AMOY_USDC_ADDRESS = process.env.AMOY_USDC_ADDRESS || '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582';

// Simple in-memory nonce store to prevent replays in demo
const usedNonces = new Set<string>();

function decodeBase64Json<T = any>(b64?: string): T | null {
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json) as T;
  } catch (e) {
    return null;
  }
}

app.get('/supported', (_req: any, res: any) => {
  res.json({
    networks: [
      { name: 'polygon-amoy', chainId: 80002, schemes: ['exact'] }
    ]
  });
});

app.post('/verify', async (req: any, res: any) => {
  const body = req.body || {};
  const b64 = body.paymentPayloadBase64 || (req.headers['x-payment'] as string) || undefined;
  const payload = decodeBase64Json<PaymentPayload>(b64);
  if (!payload) return res.status(400).json({ success: false, errors: ['invalid_payload'] });

  const now = Math.floor(Date.now() / 1000);
  const errors: string[] = [];

  if (payload.chainId !== 80002) errors.push('invalid_chain');
  if (now < payload.validAfter) errors.push('not_yet_valid');
  if (now > payload.validBefore) errors.push('expired');
  if (usedNonces.has(payload.nonce)) errors.push('nonce_replay');

  // Verify signature: recover address from signature by recreating EIP-191 prefixed hash of payload
  // For demo we compute digest as keccak256 of JSON string (not full EIP-712), but we verify signature correctness
  try {
    // Try EIP-712 (TransferWithAuthorization) verification first
    const domain = {
      name: 'USDC',
      version: '2',
      chainId: payload.chainId,
      verifyingContract: payload.verifyingContract
    };
    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    };
    const message = {
      from: payload.from,
      to: payload.to,
      value: payload.value,
      validAfter: payload.validAfter,
      validBefore: payload.validBefore,
      nonce: payload.nonce
    };
    console.log('FACILITATOR: typed-data domain=', JSON.stringify(domain));
    console.log('FACILITATOR: types=', JSON.stringify(types));
    console.log('FACILITATOR: message=', JSON.stringify(message));
    console.log('FACILITATOR: signature=', payload.signature);
    try {
      const recovered = ethers.verifyTypedData(domain, types, message, payload.signature);
      if (recovered.toLowerCase() !== payload.from.toLowerCase()) {
        errors.push('signature_mismatch');
      }
    } catch (e) {
      // Fallback: older demo scheme (keccak256 of JSON) - try to recover using raw hash
      try {
        const serialized = JSON.stringify(message);
        const hash = ethers.keccak256(ethers.toUtf8Bytes(serialized));
        const recovered2 = ethers.recoverAddress(hash, payload.signature);
        console.log('FACILITATOR: fallback recovered=', recovered2);
        if (recovered2.toLowerCase() !== payload.from.toLowerCase()) {
          errors.push('signature_mismatch');
        }
      } catch (e2) {
        errors.push('signature_verification_failed');
      }
    }
  } catch (e) {
    errors.push('signature_verification_failed');
  }

  if (errors.length) return res.status(400).json({ success: false, errors });

  // For demo we do not mark nonce used until settle; verify success
  return res.json({ success: true });
});

app.post('/settle', async (req: any, res: any) => {
  const body = req.body || {};
  const b64 = body.paymentPayloadBase64 || (req.headers['x-payment'] as string) || undefined;
  const payload = decodeBase64Json<PaymentPayload>(b64);
  if (!payload) return res.status(400).json({ success: false, errors: ['invalid_payload'] });

  // Basic replay protection
  if (usedNonces.has(payload.nonce)) return res.status(400).json({ success: false, errors: ['nonce_replay'] });

  // Mark nonce used
  usedNonces.add(payload.nonce);

  // Simulated settlement: if REAL_SETTLE and RPC+PRIVATE_KEY provided, broadcast a simple 0-value tx to payTo
  let txHash: string | null = null;
  if (REAL_SETTLE && AMOY_RPC_URL && PRIVATE_KEY) {
    try {
      const provider = new ethers.JsonRpcProvider(AMOY_RPC_URL);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      const tokenAddress = process.env.AMOY_USDC_ADDRESS || '';
      if (!tokenAddress) {
        throw new Error('AMOY_USDC_ADDRESS not set for real settlement');
      }
      // Minimal ABI for EIP-3009 transferWithAuthorization
      const tokenAbi = [
        'function transferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce,bytes signature)'
      ];
      const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);
      // call transferWithAuthorization with the signed payload
      const tx = await token.transferWithAuthorization(payload.from, payload.to, payload.value, payload.validAfter, payload.validBefore, payload.nonce, payload.signature);
      console.log('FACILITATOR: settlement tx submitted', tx.hash);
      await tx.wait(1);
      txHash = tx.hash;
    } catch (e) {
      console.error('settle failed', e);
      return res.status(500).json({ success: false, errors: ['settle_error', String(e)] });
    }
  }

  // Return simulated response
  const response = { success: true, transaction: txHash, network: 'polygon-amoy', payer: payload.from };
  // encode as base64 JSON
  const b64resp = Buffer.from(JSON.stringify(response)).toString('base64');
  res.setHeader('X-PAYMENT-RESPONSE', b64resp);
  return res.json({ success: true, transaction: txHash });
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Facilitator (Amoy demo) listening on port ${PORT}`);
  console.log(`REAL_SETTLE=${REAL_SETTLE}, AMOY_RPC_URL=${AMOY_RPC_URL ? 'set' : 'unset'}`);
});