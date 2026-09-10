import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { GroupPlaceholder } from '../GroupPlaceholder.node';

describe('GroupPlaceholder', () => {
	it('forwards its input items unchanged', async () => {
		const items: INodeExecutionData[] = [{ json: { a: 1 } }, { json: { b: 2 } }];
		const ctx = mock<IExecuteFunctions>({ getInputData: () => items });

		const result = await new GroupPlaceholder().execute.call(ctx);

		expect(result).toEqual([items]);
	});
});
