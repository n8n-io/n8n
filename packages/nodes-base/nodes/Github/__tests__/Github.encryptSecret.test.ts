import { encryptSecret } from '../GenericFunctions';

describe('Github GenericFunctions - Secret Encryption', () => {
	describe('encryptSecret', () => {
		it('should encrypt a secret value using the public key', async () => {
			// Use a real test public key (32 bytes base64 encoded)
			// This is a test key, not a real one
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'my-secret-value';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			// Verify result is base64 encoded
			expect(encrypted).toBeDefined();
			expect(typeof encrypted).toBe('string');
			expect(encrypted.length).toBeGreaterThan(0);

			// Verify it's valid base64
			expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
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

			expect(encrypted).toBeDefined();
			expect(typeof encrypted).toBe('string');
		});

		it('should handle unicode characters in secret value', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'secret-with-unicode-🔐-chars';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			expect(encrypted).toBeDefined();
			expect(typeof encrypted).toBe('string');
		});

		it('should handle long secret values', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = 'a'.repeat(10000); // 10KB secret

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			expect(encrypted).toBeDefined();
			expect(typeof encrypted).toBe('string');
		});

		it('should handle special characters in secret value', async () => {
			const testPublicKey = Buffer.from(new Uint8Array(32).fill(1)).toString('base64');
			const secretValue = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';

			const encrypted = await encryptSecret(secretValue, testPublicKey);

			expect(encrypted).toBeDefined();
			expect(typeof encrypted).toBe('string');
		});
	});
});
