import { encryptSecret } from '../GenericFunctions';

// crypto_box_SEALBYTES: a 32-byte ephemeral public key plus a 16-byte MAC
const SEALED_BOX_OVERHEAD = 48;

describe('Github GenericFunctions - Secret Encryption', () => {
	describe('encryptSecret', () => {
		it('should encrypt a secret value using the public key', async () => {
			// Use a real test public key (32 bytes base64 encoded)
			// This is a test key, not a real one
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'my-secret-value';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			// Verify the result is canonical base64 that round-trips
			expect(typeof encrypted).toBe('string');
			expect(encrypted).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
			expect(Buffer.from(encrypted, 'base64').toString('base64')).toBe(encrypted);

			// A libsodium sealed box adds a 32-byte ephemeral public key and a 16-byte MAC
			expect(Buffer.from(encrypted, 'base64')).toHaveLength(
				Buffer.byteLength(secretValue, 'utf8') + SEALED_BOX_OVERHEAD,
			);
		});

		it('should produce different encrypted values for same input (due to random nonce)', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'my-secret-value';

			const encrypted1 = await encryptSecret(secretValue, testPublicKey);
			const encrypted2 = await encryptSecret(secretValue, testPublicKey);

			// Due to random nonce in sealed box, same input should produce different output
			expect(encrypted1).not.toBe(encrypted2);
		});

		it('should handle empty secret value', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = '';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			// An empty plaintext still produces the sealed-box header and MAC
			expect(Buffer.from(encrypted, 'base64')).toHaveLength(SEALED_BOX_OVERHEAD);
		});

		it('should handle unicode characters in secret value', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'secret-with-unicode-🔐-chars';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			// Length is derived from the UTF-8 byte count, not the JS string length
			expect(Buffer.from(encrypted, 'base64')).toHaveLength(
				Buffer.byteLength(secretValue, 'utf8') + SEALED_BOX_OVERHEAD,
			);
		});

		it('should handle long secret values', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'a'.repeat(10000); // 10KB secret

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			expect(Buffer.from(encrypted, 'base64')).toHaveLength(
				secretValue.length + SEALED_BOX_OVERHEAD,
			);
		});

		it('should handle special characters in secret value', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			expect(Buffer.from(encrypted, 'base64')).toHaveLength(
				Buffer.byteLength(secretValue, 'utf8') + SEALED_BOX_OVERHEAD,
			);
		});
	});
});
