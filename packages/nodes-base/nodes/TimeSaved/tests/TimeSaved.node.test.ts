import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { TimeSaved } from '../TimeSaved.node';

describe('TimeSaved node', () => {
	function createExecuteFunctionsMock(options?: {
		mode?: 'once' | 'perItem';
		minutesSaved?: number;
		items?: INodeExecutionData[];
		continueOnFail?: boolean;
	}) {
		const {
			items = [{ json: {} }],
			mode = 'once',
			minutesSaved = 10,
			continueOnFail = false,
		} = options ?? {};

		const setMetadata = jest.fn();
		const continueOnFailMock = jest.fn().mockReturnValue(continueOnFail);

		return {
			executeFunctions: mock<IExecuteFunctions>({
				getInputData: jest.fn().mockReturnValue(items),
				getNodeParameter: jest.fn().mockReturnValueOnce(mode).mockReturnValueOnce(minutesSaved),
				continueOnFail: continueOnFailMock,
				setMetadata,
				getNode: jest.fn().mockReturnValue({ name: 'TimeSaved', type: 'timeSaved' }),
			}),
			setMetadata,
			continueOnFail: continueOnFailMock,
		};
	}

	it('should be defined', () => {
		expect(TimeSaved).toBeDefined();
	});

	it('should expose minutesSaved as a whole number with correct typeOptions', () => {
		const node = new TimeSaved();
		const minutesSaved = node.description.properties.find((p) => p.name === 'minutesSaved');
		expect(minutesSaved?.typeOptions).toEqual(
			expect.objectContaining({ minValue: 0, numberPrecision: 0 }),
		);
	});

	it('should set metadata with time saved for once mode', async () => {
		const node = new TimeSaved();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock();

		const result = await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledWith({
			timeSaved: {
				minutes: 10,
			},
		});

		expect(result[0].length).toEqual(1);
	});

	it('should set metadata with time saved for per item option', async () => {
		const node = new TimeSaved();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			items: [{ json: {} }, { json: {} }],
			mode: 'perItem',
		});

		const result = await node.execute.call(executeFunctions);

		expect(setMetadata).toHaveBeenCalledWith({
			timeSaved: {
				minutes: 20,
			},
		});

		expect(result[0].length).toEqual(2);
	});

	it('should return an error if the minutes saved is negative', async () => {
		const node = new TimeSaved();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			minutesSaved: -1,
		});

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(
			'Time saved cannot be negative, got: -1',
		);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should return an error if the minutes saved is not a number', async () => {
		const node = new TimeSaved();

		const { executeFunctions, setMetadata } = createExecuteFunctionsMock({
			// @ts-expect-error - we want to test the error case
			minutesSaved: 'not a number',
		});

		await expect(node.execute.call(executeFunctions)).rejects.toThrow(
			'Parameter "minutesSaved" is not number',
		);

		expect(setMetadata).not.toHaveBeenCalled();
	});

	it('should continue on fail when setMetadata throws and continue on fail is enabled', async () => {
		const node = new TimeSaved();

		const { executeFunctions, setMetadata, continueOnFail } = createExecuteFunctionsMock({
			continueOnFail: true,
		});
		setMetadata.mockImplementationOnce(() => {
			throw new Error('Test error');
		});

		const result = await node.execute.call(executeFunctions);

		expect(result[0].length).toEqual(1);
		expect(continueOnFail).toHaveBeenCalled();
	});
});
