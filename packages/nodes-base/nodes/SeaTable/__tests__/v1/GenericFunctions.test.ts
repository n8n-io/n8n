import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

import { seaTableApiRequest } from '../../v1/GenericFunctions';

describe('Seatable > v1 > GenericFunctions', () => {
	describe('seaTableApiRequest', () => {
		it('should encode a row ID with "/" in the request URL', async () => {
			const request = vi
				.fn()
				.mockResolvedValueOnce({ access_token: 'fake-base-token', dtable_uuid: 'b7e5c1d2' })
				.mockResolvedValueOnce({});
			const context = mock<IExecuteFunctions>({ helpers: { request } });
			context.getCredentials.mockResolvedValue({
				environment: 'selfHosted',
				domain: 'https://seatable.example.com/',
				token: 'fake-api-token',
			});
			const rowId = 'Qtf7x/metadata';

			await seaTableApiRequest.call(
				context,
				{},
				'GET',
				(dtableUuid) => requestPath`/dtable-server/api/v1/dtables/${dtableUuid}/rows/${rowId}`,
			);

			expect(request).toHaveBeenLastCalledWith(
				expect.objectContaining({
					uri: requestUrl`https://seatable.example.com/dtable-server/api/v1/dtables/b7e5c1d2/rows/Qtf7x%2Fmetadata`,
				}),
			);
		});

		it('should reject a path value with a dot segment', async () => {
			const request = vi
				.fn()
				.mockResolvedValueOnce({ access_token: 'fake-base-token', dtable_uuid: 'b7e5c1d2' });
			const context = mock<IExecuteFunctions>({ helpers: { request } });
			context.getCredentials.mockResolvedValue({
				environment: 'selfHosted',
				domain: 'https://seatable.example.com/',
				token: 'fake-api-token',
			});
			const rowId = 'Qtf7x/../metadata';

			await expect(
				seaTableApiRequest.call(
					context,
					{},
					'GET',
					(dtableUuid) => requestPath`/dtable-server/api/v1/dtables/${dtableUuid}/rows/${rowId}`,
				),
			).rejects.toThrow('Invalid identifier');
			expect(request).toHaveBeenCalledTimes(1);
		});
	});
});
