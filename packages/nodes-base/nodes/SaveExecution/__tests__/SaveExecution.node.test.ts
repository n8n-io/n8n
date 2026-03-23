import type { IExecuteFunctions } from 'n8n-workflow';
import { SaveExecution } from '../SaveExecution.node';

describe('SaveExecution node', () => {
	const mockSetMetadata = jest.fn();

	const createExecutionFunctions = (saveExecution: boolean) =>
		({
			getInputData: jest.fn().mockReturnValue([{ json: { key: 'value' } }]),
			getNodeParameter: jest.fn().mockReturnValueOnce(saveExecution),
			setMetadata: mockSetMetadata,
		}) as unknown as IExecuteFunctions;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should set saveExecution metadata to true when save is enabled', async () => {
		const node = new SaveExecution();
		const fns = createExecutionFunctions(true);

		const result = await node.execute.call(fns);

		expect(mockSetMetadata).toHaveBeenCalledWith({ saveExecution: true });
		expect(result[0]).toEqual([{ json: { key: 'value' } }]);
	});

	it('should set saveExecution metadata to false when save is disabled', async () => {
		const node = new SaveExecution();
		const fns = createExecutionFunctions(false);

		const result = await node.execute.call(fns);

		expect(mockSetMetadata).toHaveBeenCalledWith({ saveExecution: false });
		expect(result[0]).toEqual([{ json: { key: 'value' } }]);
	});

	it('should pass through all input items unchanged', async () => {
		const node = new SaveExecution();
		const items = [{ json: { a: 1 } }, { json: { b: 2 } }, { json: { c: 3 } }];
		const fns = {
			getInputData: jest.fn().mockReturnValue(items),
			getNodeParameter: jest.fn().mockReturnValueOnce(true),
			setMetadata: mockSetMetadata,
		} as unknown as IExecuteFunctions;

		const result = await node.execute.call(fns);

		expect(result[0]).toEqual(items);
		expect(result[0].length).toBe(3);
	});
});
