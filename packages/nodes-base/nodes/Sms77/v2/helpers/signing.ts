import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

const MAX_TIMESTAMP_DRIFT_SECONDS = 30;

export interface SevenSignatureInput {
	timestamp: string;
	nonce: string;
	method: string;
	url: string;
	rawBody: string;
}

export function buildStringToSign(input: SevenSignatureInput): string {
	const bodyMd5 = createHash('md5').update(input.rawBody, 'utf8').digest('hex');
	return [input.timestamp, input.nonce, input.method, input.url, bodyMd5].join('\n');
}

export function computeSignature(input: SevenSignatureInput, signingKey: string): string {
	const stringToSign = buildStringToSign(input);
	return createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');
}

export function verifySignature(this: IWebhookFunctions, signingKey: string): boolean {
	if (!signingKey) return true;

	const headers = this.getHeaderData() as Record<string, string | undefined>;
	const providedSignature = headers['x-signature'];
	const timestamp = headers['x-timestamp'];
	const nonce = headers['x-nonce'];

	if (!providedSignature || !timestamp || !nonce) return false;

	const ts = Number.parseInt(timestamp, 10);
	if (!Number.isFinite(ts)) return false;
	const nowSec = Math.floor(Date.now() / 1000);
	if (Math.abs(nowSec - ts) > MAX_TIMESTAMP_DRIFT_SECONDS) return false;

	const req = this.getRequestObject();
	let rawBody = '';
	const reqRaw = (req as unknown as { rawBody?: Buffer | string }).rawBody;
	if (reqRaw) {
		rawBody = Buffer.isBuffer(reqRaw) ? reqRaw.toString('utf8') : reqRaw;
	} else if (req.body !== undefined) {
		rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
	}

	const url = this.getNodeWebhookUrl('default') ?? '';
	const method = (req.method ?? 'POST').toUpperCase();

	const expected = computeSignature({ timestamp, nonce, method, url, rawBody }, signingKey);

	const expectedBuf = Buffer.from(expected, 'utf8');
	const providedBuf = Buffer.from(providedSignature, 'utf8');
	if (expectedBuf.length !== providedBuf.length) return false;
	return timingSafeEqual(expectedBuf, providedBuf);
}
