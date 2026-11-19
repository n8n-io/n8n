import type { ICredentialDataDecryptedObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { RundeckApi } from '../RundeckApi';

describe('RundeckApi', () => {
	const requestOptionsFor = async (
		typeVersion: number,
		credentials: ICredentialDataDecryptedObject,
	) => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		executeFunctions.getCredentials.mockResolvedValue(credentials);
		executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({});

		const rundeckApi = new RundeckApi(executeFunctions);
		await rundeckApi.init();
		await rundeckApi.getJobMetadata('job-1');

		expect(executeFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		return executeFunctions.helpers.requestWithAuthentication.mock.calls[0][1];
	};

	const credentials = { url: 'https://rundeck.example.com', token: 'test-token' };

	it('should encode path values', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
		executeFunctions.getCredentials.mockResolvedValue(credentials);
		executeFunctions.helpers.requestWithAuthentication.mockResolvedValue({});

		const rundeckApi = new RundeckApi(executeFunctions);
		await rundeckApi.init();
		await rundeckApi.getJobMetadata('job-1/run?x=1');

		expect(executeFunctions.helpers.requestWithAuthentication.mock.calls[0][1].uri).toEqual(
			requestUrl`https://rundeck.example.com/api/18/job/job-1%2Frun%3Fx=1/info`,
		);
	});

	describe('TLS certificate validation', () => {
		describe('sslCertificateValidation: default', () => {
			it('should validate certificates on node version 1.1', async () => {
				const options = await requestOptionsFor(1.1, {
					...credentials,
					sslCertificateValidation: 'default',
				});

				expect(options.rejectUnauthorized).toBe(true);
			});

			it('should skip certificate validation on node version 1', async () => {
				const options = await requestOptionsFor(1, {
					...credentials,
					sslCertificateValidation: 'default',
				});

				expect(options.rejectUnauthorized).toBe(false);
			});

			it('should treat a missing value as default', async () => {
				const options = await requestOptionsFor(1.1, credentials);

				expect(options.rejectUnauthorized).toBe(true);
			});
		});

		describe('sslCertificateValidation: enabled', () => {
			it('should validate certificates on any node version', async () => {
				const options = await requestOptionsFor(1, {
					...credentials,
					sslCertificateValidation: 'enabled',
				});

				expect(options.rejectUnauthorized).toBe(true);
			});
		});

		describe('sslCertificateValidation: disabled', () => {
			it('should skip certificate validation on any node version', async () => {
				const options = await requestOptionsFor(1.1, {
					...credentials,
					sslCertificateValidation: 'disabled',
				});

				expect(options.rejectUnauthorized).toBe(false);
			});
		});
	});
});
