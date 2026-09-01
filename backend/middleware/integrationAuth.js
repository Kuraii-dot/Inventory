import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

export function authenticateTcmsIntegration(req, res, next) {
  const configuredKey = process.env.INVENTORY_INTEGRATION_KEY || '';
  if (!configuredKey) {
    return res.status(503).json({ message: 'TCMS inventory integration is not configured.' });
  }

  const suppliedKey = String(req.headers['x-integration-key'] || '');
  const configuredBuffer = Buffer.from(configuredKey);
  const suppliedBuffer = Buffer.from(suppliedKey);
  const valid = configuredBuffer.length === suppliedBuffer.length
    && crypto.timingSafeEqual(configuredBuffer, suppliedBuffer);

  if (!valid) {
    return res.status(401).json({ message: 'Invalid integration key.' });
  }

  next();
}
