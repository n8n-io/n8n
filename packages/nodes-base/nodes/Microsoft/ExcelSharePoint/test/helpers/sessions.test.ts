import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mockDeep } from 'vitest-mock-extended';

import { withWorkbookSession } from '../../helpers/sessions';
import * as transport from '../../transport';
import type * as _importType0 from '../../transport';

// Real transport module except the network helper
vi.mock('../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft Excel (SharePoint) — helpers/sessions', () => {
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;
	const workbookRoot = '/v1.0/sites/s/drives/d/items/i';

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
	});

	it('opens a session, runs send with the session header, then closes the session', async () => {
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource === `${workbookRoot}/workbook/createSession`) return { id: 'session-abc' };
			if (resource === `${workbookRoot}/workbook/closeSession`) return {};
			throw new Error(`unexpected request: ${resource}`);
		});
		const send = vi.fn().mockResolvedValue('done');

		const result = await withWorkbookSession.call(ctx, workbookRoot, send);

		expect(result).toBe('done');
		expect(send).toHaveBeenCalledWith({ 'workbook-session-id': 'session-abc' });
		expect(apiRequest).toHaveBeenNthCalledWith(
			1,
			'POST',
			`${workbookRoot}/workbook/createSession`,
			{ persistChanges: true },
		);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${workbookRoot}/workbook/closeSession`,
			{},
			{},
			undefined,
			{ 'workbook-session-id': 'session-abc' },
		);
	});

	it('closes the session even when send throws', async () => {
		apiRequest.mockResolvedValue({ id: 'session-abc' });
		const send = vi.fn().mockRejectedValue(new Error('boom'));

		await expect(withWorkbookSession.call(ctx, workbookRoot, send)).rejects.toThrow('boom');

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${workbookRoot}/workbook/closeSession`,
			{},
			{},
			undefined,
			{ 'workbook-session-id': 'session-abc' },
		);
	});

	it('does not attempt to close a session that never opened', async () => {
		apiRequest.mockRejectedValueOnce(new Error('createSession failed'));
		const send = vi.fn();

		await expect(withWorkbookSession.call(ctx, workbookRoot, send)).rejects.toThrow(
			'createSession failed',
		);

		expect(send).not.toHaveBeenCalled();
		expect(apiRequest).toHaveBeenCalledTimes(1);
	});

	it("returns send's result even when closeSession itself fails", async () => {
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource === `${workbookRoot}/workbook/createSession`) return { id: 'session-abc' };
			if (resource === `${workbookRoot}/workbook/closeSession`) {
				throw new Error('closeSession unreachable');
			}
			throw new Error(`unexpected request: ${resource}`);
		});
		const send = vi.fn().mockResolvedValue('done');

		const result = await withWorkbookSession.call(ctx, workbookRoot, send);

		expect(result).toBe('done');
	});

	it("propagates send's error, not closeSession's, when both fail", async () => {
		apiRequest.mockImplementation(async (_method: string, resource: string) => {
			if (resource === `${workbookRoot}/workbook/createSession`) return { id: 'session-abc' };
			if (resource === `${workbookRoot}/workbook/closeSession`) {
				throw new Error('closeSession unreachable');
			}
			throw new Error(`unexpected request: ${resource}`);
		});
		const send = vi.fn().mockRejectedValue(new Error('boom'));

		await expect(withWorkbookSession.call(ctx, workbookRoot, send)).rejects.toThrow('boom');
	});
});
