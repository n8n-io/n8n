import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import {
	resolveReportDownloadUrl,
	SECURITY_SCORECARD_API_BASE_URL,
	scorecardApiRequest,
} from '../GenericFunctions';
import { SecurityScorecard } from '../SecurityScorecard.node';

describe('SecurityScorecard GenericFunctions', () => {
	describe('resolveReportDownloadUrl', () => {
		it('should build API URL from a report file path', () => {
			expect(resolveReportDownloadUrl('example-report.pdf')).toBe(
				`${SECURITY_SCORECARD_API_BASE_URL}/reports/files/example-report.pdf`,
			);
		});

		it('should preserve paths that already include reports/files', () => {
			expect(resolveReportDownloadUrl('reports/files/nested/report.pdf')).toBe(
				`${SECURITY_SCORECARD_API_BASE_URL}/reports/files/nested/report.pdf`,
			);
		});

		it('should accept full SecurityScorecard API URLs', () => {
			const url = 'https://api.securityscorecard.io/reports/files/example-report.pdf';

			expect(resolveReportDownloadUrl(url)).toBe(url);
		});

		it('should reject external full URLs', () => {
			expect(() => {
				resolveReportDownloadUrl('https://example.com/report.pdf');
			}).toThrow('Report URL must point to SecurityScorecard report files');
		});

		it('should reject full API URLs outside report files', () => {
			expect(() => {
				resolveReportDownloadUrl('https://api.securityscorecard.io/companies/example.com');
			}).toThrow('Report URL must point to SecurityScorecard report files');
		});

		it('should reject absolute URLs with other protocols', () => {
			expect(() => {
				resolveReportDownloadUrl('ftp://api.securityscorecard.io/reports/files/report.pdf');
			}).toThrow('Report URL must point to SecurityScorecard report files');
		});

		it('should reject full report URLs with unexpected ports', () => {
			expect(() => {
				resolveReportDownloadUrl('https://api.securityscorecard.io:444/reports/files/report.pdf');
			}).toThrow('Report URL must point to SecurityScorecard report files');
		});

		it('should reject paths that resolve outside report files', () => {
			expect(() => {
				resolveReportDownloadUrl('reports/files/../report.pdf');
			}).toThrow('Report URL must point to SecurityScorecard report files');
		});

		it('should reject empty input', () => {
			expect(() => {
				resolveReportDownloadUrl('   ');
			}).toThrow('Report URL is required');
		});
	});

	describe('scorecardApiRequest', () => {
		let request: Mock;
		let executeFunctions: IExecuteFunctions;

		beforeEach(() => {
			request = vi.fn().mockResolvedValue({ success: true });
			executeFunctions = {
				getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				getNode: vi.fn().mockReturnValue({ name: 'SecurityScorecard' }),
				helpers: {
					request,
				},
			} as unknown as IExecuteFunctions;
		});

		it('should allow requests to the SecurityScorecard API host', async () => {
			await scorecardApiRequest.call(
				executeFunctions,
				'GET',
				'',
				{},
				{},
				'https://api.securityscorecard.io/reports/files/example-report.pdf',
			);

			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { Authorization: 'Token test-api-key' },
					method: 'GET',
					uri: 'https://api.securityscorecard.io/reports/files/example-report.pdf',
				}),
			);
		});
	});

	describe('download operation', () => {
		it('should reject external report URLs before making a request', async () => {
			const request = vi.fn();
			const node = new SecurityScorecard();
			const executeFunctions = {
				getInputData: vi.fn().mockReturnValue([{ json: {} }]),
				getNode: vi.fn().mockReturnValue({ name: 'SecurityScorecard' }),
				getNodeParameter: vi.fn((parameterName: string) => {
					if (parameterName === 'resource') return 'report';
					if (parameterName === 'operation') return 'download';
					if (parameterName === 'url') return 'https://example.com/report.pdf';

					return undefined;
				}),
				helpers: {
					request,
				},
			} as unknown as IExecuteFunctions;

			await expect(node.execute.call(executeFunctions)).rejects.toThrow(
				'Report URL must point to SecurityScorecard report files',
			);

			expect(request).not.toHaveBeenCalled();
		});
	});
});
