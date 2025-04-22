import crypto from 'crypto';

export function verifyMuxSignature(rawBody: Buffer, muxSignature: string, webhookSigningSecret: string): boolean {
  const expected = crypto
    .createHmac('sha256', webhookSigningSecret)
    .update(rawBody)
    .digest('hex');

  return muxSignature === expected;
}