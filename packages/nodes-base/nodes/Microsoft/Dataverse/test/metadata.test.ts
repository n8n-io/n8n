import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { dataverseApiRequest } from '../GenericFunctions';
import { isElasticTable, resolveTableMetadata } from '../operations/metadata';

vi.mock('../GenericFunctions', () => ({
	dataverseApiRequest: vi.fn(),
}));

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';

describe('Microsoft Dataverse table metadata', () => {
	it('resolves and caches table metadata per execution', async () => {
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue({ name: 'Microsoft Dataverse' } as INode);
		vi.mocked(dataverseApiRequest).mockResolvedValue({
			value: [
				{
					LogicalName: 'sensordata',
					EntitySetName: 'sensordatas',
					PrimaryIdAttribute: 'sensordataid',
					TableType: 'Elastic',
				},
			],
		});

		const first = await resolveTableMetadata(ctx, CREDENTIAL_TYPE, 'sensordatas');
		const second = await resolveTableMetadata(ctx, CREDENTIAL_TYPE, 'sensordatas');

		expect(first).toEqual(second);
		expect(first && isElasticTable(first)).toBe(true);
		expect(dataverseApiRequest).toHaveBeenCalledTimes(1);
		expect(vi.mocked(dataverseApiRequest).mock.calls[0]?.[4]).toMatchObject({
			$select: 'LogicalName,EntitySetName,PrimaryIdAttribute,TableType',
		});
	});
});
