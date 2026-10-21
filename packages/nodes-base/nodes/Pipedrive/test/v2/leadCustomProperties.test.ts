import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { loadLeadCustomProperties } from '../../v2/actions/lead/customProperties';
import { pipedriveGetCustomProperties } from '../../v2/transport';

vi.mock('../../v2/transport', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../v2/transport')>()),
	pipedriveGetCustomProperties: vi.fn(),
}));

const hashKey = 'd4a8f5b7c2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7';

function executeFunctions(typeVersion: number, fieldsForItem: Array<() => unknown>) {
	return {
		getNode: () => ({ typeVersion }),
		getInputData: () => fieldsForItem.map(() => ({ json: {} })),
		continueOnFail: () => true,
		getNodeParameter: (name: string, i: number, fallback?: unknown) => {
			if (name === 'rawCustomFieldKeys') return false;
			return fieldsForItem[i] ? fieldsForItem[i]() : fallback;
		},
	} as unknown as IExecuteFunctions;
}

describe('loadLeadCustomProperties', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(pipedriveGetCustomProperties as Mock).mockResolvedValue({
			title: { name: 'Title', key: 'title', field_type: 'varchar' },
			[hashKey]: { name: 'Region', key: hashKey, field_type: 'varchar' },
		});
	});

	it('should not read the lead fields on version 2 without custom fields', async () => {
		const result = await loadLeadCustomProperties.call(
			executeFunctions(2, [() => ({ label: 'hot' })]),
			'additionalFields',
		);

		expect(pipedriveGetCustomProperties).not.toHaveBeenCalled();
		expect(result).toEqual({ resolveOutput: false });
	});

	it('should skip items whose parameter throws or is null instead of failing the node', async () => {
		const result = await loadLeadCustomProperties.call(
			executeFunctions(2, [
				() => {
					throw new Error('broken expression');
				},
				() => null,
				() => ({ customFields: { property: [{ name: 'Region', value: 'EMEA' }] } }),
			]),
			'additionalFields',
		);

		expect(pipedriveGetCustomProperties).toHaveBeenCalledTimes(1);
		expect(result.customProperties).toEqual({
			[hashKey]: { name: 'Region', key: hashKey, field_type: 'varchar' },
		});
	});

	it('should read the lead fields on version 2.1 to resolve the output', async () => {
		const result = await loadLeadCustomProperties.call(
			executeFunctions(2.1, [() => ({})]),
			'updateFields',
		);

		expect(pipedriveGetCustomProperties).toHaveBeenCalledTimes(1);
		expect(result.resolveOutput).toBe(true);
	});
});
