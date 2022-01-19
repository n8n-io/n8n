import {shouldUpdateConsentStatus} from '../../../nodes/Gllue/GenericFunctions';
import {CONSENT_STATUS_CONSENTED, CONSENT_STATUS_SENT} from '../../../nodes/Gllue/constants';

describe('shouldUpdateConsentStatus', () => {
	it('should return True when current status is empty and new status is sent', () => {
		expect(shouldUpdateConsentStatus(undefined, CONSENT_STATUS_SENT)).toBeTruthy();
	});
	it('should return False when current status is "sent" and new status is "sent"', () => {
		expect(shouldUpdateConsentStatus(CONSENT_STATUS_SENT, CONSENT_STATUS_SENT)).toBeFalsy();
	});
	it('should return True when current status is "sent" and new status is "consented"', () => {
		expect(shouldUpdateConsentStatus(CONSENT_STATUS_SENT, CONSENT_STATUS_CONSENTED)).toBeTruthy();
	});
	it('should return False when current status is "consented" and new status is "sent"', () => {
		expect(shouldUpdateConsentStatus(CONSENT_STATUS_CONSENTED, CONSENT_STATUS_SENT)).toBeFalsy();
	});
});
