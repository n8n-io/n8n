import { isPhoneValid } from '../GenericFunctions';

describe('isPhoneValid', () => {
	it('should return true for a valid phone number', () => {
		const phone = '+1234567890';
		const result = isPhoneValid(phone);
		expect(result).toBe(true);
	});

	it('should return false for an invalid phone number', () => {
		const phone = 'invalid-phone';
		const result = isPhoneValid(phone);
		expect(result).toBe(false);
	});

	it('should return false for a phone number with invalid characters', () => {
		const phone = '+123-abc-456';
		const result = isPhoneValid(phone);
		expect(result).toBe(false);
	});

	it('should return false for an empty phone number', () => {
		const phone = '';
		const result = isPhoneValid(phone);
		expect(result).toBe(false);
	});

	it('should return false for a phone number with only special characters', () => {
		const phone = '!!!@@@###';
		const result = isPhoneValid(phone);
		expect(result).toBe(false);
	});
});
