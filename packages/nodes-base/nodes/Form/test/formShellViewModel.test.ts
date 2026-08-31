import type { CredentialCheckStatus } from 'n8n-workflow';

import { buildFormShellViewModel, formShellSummaryText } from '../utils/utils';

const credential = (overrides: Partial<CredentialCheckStatus> = {}): CredentialCheckStatus => ({
	credentialId: 'cred-1',
	credentialName: 'Google Sheets account',
	credentialType: 'googleSheetsOAuth2Api',
	resolverId: 'resolver-1',
	status: 'missing',
	...overrides,
});

const missing = (n: number) =>
	Array.from({ length: n }, (_, i) =>
		credential({ credentialId: `missing-${i}`, credentialName: `Account ${i}` }),
	);

const configured = (n: number) =>
	Array.from({ length: n }, (_, i) =>
		credential({
			credentialId: `configured-${i}`,
			credentialName: `Account ${i}`,
			status: 'configured',
		}),
	);

describe('formShellSummaryText', () => {
	it('should ask for every account when none are connected', () => {
		expect(formShellSummaryText(2, 0)).toBe('2 accounts needed to submit this form');
		expect(formShellSummaryText(5, 0)).toBe('5 accounts needed to submit this form');
	});

	it('should count down the remaining accounts, singular for the last one', () => {
		expect(formShellSummaryText(2, 1)).toBe('1 more account needed to submit this form');
		expect(formShellSummaryText(5, 4)).toBe('1 more account needed to submit this form');
	});

	it('should pluralise the remaining accounts', () => {
		expect(formShellSummaryText(5, 1)).toBe('4 more accounts needed to submit this form');
		expect(formShellSummaryText(3, 1)).toBe('2 more accounts needed to submit this form');
	});

	it('should report readiness once every account is connected', () => {
		expect(formShellSummaryText(2, 2)).toBe('All 2 accounts connected · ready to submit');
		expect(formShellSummaryText(4, 4)).toBe('All 4 accounts connected · ready to submit');
	});

	it('should never render "account(s)"', () => {
		for (let total = 1; total <= 6; total++) {
			for (let connectedCount = 0; connectedCount <= total; connectedCount++) {
				expect(formShellSummaryText(total, connectedCount)).not.toContain('(s)');
			}
		}
	});
});

describe('buildFormShellViewModel', () => {
	describe('the 1-vs-2+ threshold', () => {
		it('should connect a single account directly from its row, without the dialog', () => {
			expect(buildFormShellViewModel(missing(1)).useDialog).toBe(false);
			expect(buildFormShellViewModel(configured(1)).useDialog).toBe(false);
		});

		it('should collapse two or more accounts behind the dialog', () => {
			expect(buildFormShellViewModel(missing(2)).useDialog).toBe(true);
			expect(buildFormShellViewModel(missing(3)).useDialog).toBe(true);
			expect(buildFormShellViewModel([...configured(2), ...missing(1)]).useDialog).toBe(true);
		});
	});

	describe('counts', () => {
		it('should count connected accounts from the configured status', () => {
			const vm = buildFormShellViewModel([...configured(2), ...missing(3)]);

			expect(vm.total).toBe(5);
			expect(vm.connectedCount).toBe(2);
			expect(vm.allConnected).toBe(false);
			expect(vm.credentials.filter((c) => c.connected)).toHaveLength(2);
		});

		it('should not treat a resolver_missing account as connected', () => {
			const vm = buildFormShellViewModel([
				...configured(1),
				credential({ credentialId: 'blocked', status: 'resolver_missing' }),
			]);

			expect(vm.connectedCount).toBe(1);
			expect(vm.allConnected).toBe(false);
		});

		it('should mark everything connected only when no account is outstanding', () => {
			expect(buildFormShellViewModel(configured(2)).allConnected).toBe(true);
			expect(buildFormShellViewModel([]).allConnected).toBe(false);
		});

		it('should pluralise the dialog footer counter', () => {
			expect(buildFormShellViewModel(missing(1)).footerText).toBe('0 of 1 account connected');
			expect(buildFormShellViewModel([...configured(1), ...missing(1)]).footerText).toBe(
				'1 of 2 accounts connected',
			);
			expect(buildFormShellViewModel(configured(3)).footerText).toBe('3 of 3 accounts connected');
		});

		it('should carry the summary line for the rendered state', () => {
			expect(buildFormShellViewModel([...configured(1), ...missing(2)]).summaryText).toBe(
				'2 more accounts needed to submit this form',
			);
		});
	});

	describe('icons', () => {
		it("should pass through the credential type's resolved icon", () => {
			const vm = buildFormShellViewModel([
				credential({ iconUrl: 'http://localhost:5678/icons/pkg/googleSheets.svg' }),
			]);

			expect(vm.credentials[0].iconUrl).toBe('http://localhost:5678/icons/pkg/googleSheets.svg');
		});

		it('should always provide a letter tile as the fallback', () => {
			const vm = buildFormShellViewModel([
				credential({ credentialName: 'Google Sheets account' }),
				credential({ credentialId: 'cred-2', credentialName: 'slack account', iconUrl: 'i.svg' }),
			]);

			expect(vm.credentials[0].iconUrl).toBeUndefined();
			expect(vm.credentials[0].initial).toBe('G');
			// The tile is still there behind a resolved icon, for a failed image load.
			expect(vm.credentials[1].initial).toBe('S');
		});

		it('should fall back to "?" when the name yields no letter', () => {
			const vm = buildFormShellViewModel([credential({ credentialName: '   ' })]);

			expect(vm.credentials[0].initial).toBe('?');
		});
	});

	describe('rows', () => {
		it('should show the submitter as the connected account, and only once connected', () => {
			const vm = buildFormShellViewModel([...configured(1), ...missing(1)], 'jan@company.com');

			expect(vm.credentials[0].account).toBe('jan@company.com');
			expect(vm.credentials[1].account).toBeUndefined();
			expect(vm.submitterEmail).toBe('jan@company.com');
		});

		it('should carry the per-row connect and revoke links through', () => {
			const vm = buildFormShellViewModel([
				credential({
					authorizationUrl: 'http://localhost:5678/rest/credentials/cred-1/authorize?token=t',
				}),
				credential({
					credentialId: 'cred-2',
					status: 'configured',
					revokeUrl: 'http://localhost:5678/rest/credentials/cred-2/revoke?resolverId=resolver-1',
				}),
			]);

			expect(vm.credentials[0].authorizationUrl).toBe(
				'http://localhost:5678/rest/credentials/cred-1/authorize?token=t',
			);
			expect(vm.credentials[0].revokeUrl).toBeUndefined();
			expect(vm.credentials[1].revokeUrl).toBe(
				'http://localhost:5678/rest/credentials/cred-2/revoke?resolverId=resolver-1',
			);
		});
	});
});
