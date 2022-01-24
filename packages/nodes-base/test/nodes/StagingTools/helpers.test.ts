import {isValid} from '../../../nodes/StagingTools/herlpers';

describe('staging email blocker', () => {
	it('should be true with valid email on dev/staging stage', () => {
		const flag = isValid('staging', 'flash@cgptalent.com');
		expect(flag).toBeTruthy();
	});
	it('should be false with invalid email on dev/staging stage', () => {
		const flag = isValid('staging', 'invalid@cgptalent.com');
		expect(flag).toBeFalsy();
	});
	it('should be true on production', () => {
		const flag = isValid('production', 'any.one@cgptalent.com');
		expect(flag).toBeTruthy();
	});
});
