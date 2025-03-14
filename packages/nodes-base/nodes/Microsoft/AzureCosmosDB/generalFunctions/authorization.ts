import * as crypto from 'crypto';

export function getAuthorizationTokenUsingMasterKey(
	verb: string,
	resourceType: string,
	resourceId: string,
	masterKey: string,
): string {
	const date = new Date().toUTCString().toLowerCase();

	const key = Buffer.from(masterKey, 'base64');
	const payload = `${verb.toLowerCase()}\n${resourceType.toLowerCase()}\n${resourceId}\n${date.toLowerCase()}\n\n`;
	const hmacSha256 = crypto.createHmac('sha256', key);
	const signature = hmacSha256.update(payload, 'utf8').digest('base64');

	return `type=master&ver=1.0&sig=${signature}`;
}
