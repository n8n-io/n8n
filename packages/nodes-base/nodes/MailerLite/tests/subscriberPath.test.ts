import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { MailerLiteV1 } from '../v1/MailerLiteV1.node';
import { MailerLiteV2 } from '../v2/MailerLiteV2.node';

describe('MailerLite subscriber path value', () => {
	const baseDescription = {} as INodeTypeBaseDescription;

	const getRequestUrl = async (
		node: MailerLiteV1 | MailerLiteV2,
		typeVersion: number,
		operation: 'get' | 'update',
		subscriberId: string,
	) => {
		const parameters: Record<string, unknown> = {
			resource: 'subscriber',
			operation,
			subscriberId,
			additionalFields: {},
			updateFields: {},
		};
		const httpRequestWithAuthentication = vi.fn().mockResolvedValue({ data: {} });
		const context = {
			getInputData: () => [{ json: {} }],
			getNode: () => ({ typeVersion }),
			getNodeParameter: (name: string) => parameters[name],
			continueOnFail: () => false,
			helpers: {
				httpRequestWithAuthentication,
				returnJsonArray: (data: unknown) => [{ json: data }],
				constructExecutionMetaData: (data: unknown) => data,
			},
		} as unknown as IExecuteFunctions;

		await node.execute.call(context);

		return String((httpRequestWithAuthentication as Mock).mock.calls[0][1].url);
	};

	describe.each(['get', 'update'] as const)('%s', (operation) => {
		it('should decode the subscriber ID in version 1', async () => {
			const url = await getRequestUrl(
				new MailerLiteV1(baseDescription),
				1,
				operation,
				'user%40n8n.io',
			);

			expect(url).toBe('https://api.mailerlite.com/api/v2/subscribers/user@n8n.io');
		});

		it('should decode the subscriber ID in version 2', async () => {
			const url = await getRequestUrl(
				new MailerLiteV2(baseDescription),
				2,
				operation,
				'user%40n8n.io',
			);

			expect(url).toBe('https://connect.mailerlite.com/api/subscribers/user@n8n.io');
		});

		it('should send the subscriber ID as entered in version 2.1', async () => {
			const url = await getRequestUrl(
				new MailerLiteV2(baseDescription),
				2.1,
				operation,
				'user%40n8n.io',
			);

			expect(url).toBe('https://connect.mailerlite.com/api/subscribers/user%2540n8n.io');
		});
	});
});
