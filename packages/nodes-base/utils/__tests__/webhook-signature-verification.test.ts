import { timingSafeEqual } from 'crypto';

import { verifySignature } from '../webhook-signature-verification';

jest.mock('crypto', () => ({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	...jest.requireActual('crypto'),
	timingSafeEqual: jest.fn(),
}));

describe('webhook-signature-verification', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('verifySignature', () => {
		it('should return true when signatures match', () => {
			const expectedSignature = 'sha256=abc123';
			const actualSignature = 'sha256=abc123';

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = verifySignature({
				getExpectedSignature: () => expectedSignature,
				getActualSignature: () => actualSignature,
			});

			expect(result).toBe(true);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signatures do not match', () => {
			const expectedSignature = 'sha256=abc123';
			const actualSignature = 'sha256=xyz789';

			(timingSafeEqual as jest.Mock).mockReturnValue(false);

			const result = verifySignature({
				getExpectedSignature: () => expectedSignature,
				getActualSignature: () => actualSignature,
			});

			expect(result).toBe(false);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should verify signature even when timestamp is skipped', () => {
			const expectedSignature = 'sha256=abc123';
			const actualSignature = 'sha256=xyz789';

			(timingSafeEqual as jest.Mock).mockReturnValue(false);

			const result = verifySignature({
				getExpectedSignature: () => expectedSignature,
				getActualSignature: () => actualSignature,
				getTimestamp: () => null,
				skipIfNoTimestamp: true,
			});

			expect(result).toBe(false);
			expect(timingSafeEqual).toHaveBeenCalled();
		});

		it('should return false when signatures have different lengths', () => {
			const expectedSignature = 'sha256=abc123';
			const actualSignature = 'sha256=abc1234';

			const result = verifySignature({
				getExpectedSignature: () => expectedSignature,
				getActualSignature: () => actualSignature,
			});

			expect(result).toBe(false);
			expect(timingSafeEqual).not.toHaveBeenCalled();
		});

		it('should return false when expected signature is missing', () => {
			const result = verifySignature({
				getExpectedSignature: () => null,
				getActualSignature: () => 'sha256=abc123',
			});

			expect(result).toBe(false);
		});

		it('should return false when expected signature is undefined', () => {
			const result = verifySignature({
				getExpectedSignature: () => undefined as unknown as string,
				getActualSignature: () => 'sha256=abc123',
			});

			expect(result).toBe(false);
		});

		it('should return false when actual signature is missing', () => {
			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => null,
			});

			expect(result).toBe(false);
		});

		it('should return false when actual signature is undefined', () => {
			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => undefined as unknown as string,
			});

			expect(result).toBe(false);
		});

		it('should return true when skipIfNoExpectedSignature is true and no expected signature', () => {
			const result = verifySignature({
				getExpectedSignature: () => null,
				getActualSignature: () => 'sha256=abc123',
				skipIfNoExpectedSignature: true,
			});

			expect(result).toBe(true);
		});

		it('should validate timestamp when provided and within window', () => {
			const currentTimeSec = Math.floor(Date.now() / 1000);
			const recentTimestamp = currentTimeSec - 60; // 1 minute ago

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => recentTimestamp,
			});

			expect(result).toBe(true);
		});

		it('should return false when timestamp is too old', () => {
			const currentTimeSec = Math.floor(Date.now() / 1000);
			const oldTimestamp = currentTimeSec - 400; // More than 5 minutes ago

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => oldTimestamp,
			});

			expect(result).toBe(false);
		});

		it('should return false when timestamp is too far in future', () => {
			const currentTimeSec = Math.floor(Date.now() / 1000);
			const futureTimestamp = currentTimeSec + 400; // More than 5 minutes in future

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => futureTimestamp,
			});

			expect(result).toBe(false);
		});

		it('should handle timestamp as string', () => {
			const currentTimeSec = Math.floor(Date.now() / 1000);
			const recentTimestamp = String(currentTimeSec - 60);

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => recentTimestamp,
			});

			expect(result).toBe(true);
		});

		it('should convert milliseconds timestamp to seconds', () => {
			const currentTimeMs = Date.now();
			const recentTimestampMs = currentTimeMs - 60 * 1000; // 1 minute ago in ms

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => recentTimestampMs,
			});

			expect(result).toBe(true);
		});

		it('should use custom maxTimestampAgeSeconds', () => {
			const currentTimeSec = Math.floor(Date.now() / 1000);
			const timestamp = currentTimeSec - 120; // 2 minutes ago

			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => timestamp,
				maxTimestampAgeSeconds: 60, // 1 minute window
			});

			expect(result).toBe(false);
		});

		it('should return true when skipIfNoTimestamp is true and timestamp is null', () => {
			(timingSafeEqual as jest.Mock).mockReturnValue(true);

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => null,
				skipIfNoTimestamp: true,
			});

			expect(result).toBe(true);
		});

		it('should return false when timestamp is null and skipIfNoTimestamp is false', () => {
			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => null,
				skipIfNoTimestamp: false,
			});

			expect(result).toBe(false);
		});

		it('should return false when timestamp is invalid (NaN)', () => {
			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
				getTimestamp: () => 'invalid-timestamp',
			});

			expect(result).toBe(false);
		});

		it('should handle errors gracefully and return false', () => {
			const result = verifySignature({
				getExpectedSignature: () => {
					throw new Error('Test error');
				},
				getActualSignature: () => 'sha256=abc123',
			});

			expect(result).toBe(false);
		});

		it('should handle timingSafeEqual errors gracefully', () => {
			(timingSafeEqual as jest.Mock).mockImplementation(() => {
				throw new Error('Buffer length mismatch');
			});

			const result = verifySignature({
				getExpectedSignature: () => 'sha256=abc123',
				getActualSignature: () => 'sha256=abc123',
			});

			expect(result).toBe(false);
		});
	});
});
