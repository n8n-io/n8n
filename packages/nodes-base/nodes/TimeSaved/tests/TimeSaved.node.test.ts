import type { IExecuteFunctions } from 'n8n-workflow';
import { TimeSaved } from '../TimeSaved.node';

describe('TimeSaved node', () => {
	it('should be defined', () => {
		expect(TimeSaved).toBeDefined();
	});

	it('should set metadata with time saved for fixed option', async () => {
		const node = new TimeSaved();

		const executionFunctions = {
			getInputData: jest.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: jest.fn().mockReturnValueOnce('fixed').mockReturnValueOnce(10),
			continueOnFail: jest.fn().mockReturnValue(false),
			setMetadata: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				name: 'TimeSaved',
				type: 'timeSaved',
			}),
		} as any as IExecuteFunctions;

		const result = await node.execute.call(executionFunctions);

		expect(executionFunctions.setMetadata).toHaveBeenCalledWith({
			timeSaved: {
				minutes: 10,
			},
		});

		expect(result[0].length).toEqual(1);
	});

	it('should set metadata with time saved for per item option', async () => {
		const node = new TimeSaved();

		const executionFunctions = {
			getInputData: jest.fn().mockReturnValueOnce([{ json: {} }, { json: {} }]),
			getNodeParameter: jest.fn().mockReturnValueOnce('perItem').mockReturnValueOnce(10),
			continueOnFail: jest.fn().mockReturnValue(false),
			setMetadata: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				name: 'TimeSaved',
				type: 'timeSaved',
			}),
		} as any as IExecuteFunctions;

		const result = await node.execute.call(executionFunctions);

		expect(executionFunctions.setMetadata).toHaveBeenCalledWith({
			timeSaved: {
				minutes: 20,
			},
		});

		expect(result[0].length).toEqual(2);
	});

	it('should return an error if the minutes saved is negative', async () => {
		const node = new TimeSaved();

		const executionFunctions = {
			getInputData: jest.fn().mockReturnValueOnce([{ json: {} }]),
			getNodeParameter: jest.fn().mockReturnValueOnce('fixed').mockReturnValueOnce(-1),
			continueOnFail: jest.fn().mockReturnValue(false),
			setMetadata: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				name: 'TimeSaved',
				type: 'timeSaved',
			}),
		} as any as IExecuteFunctions;

		await expect(node.execute.call(executionFunctions)).rejects.toThrow(
			'Time saved cannot be negative, got: -1',
		);

		expect(executionFunctions.setMetadata).not.toHaveBeenCalled();
	});

	it('should return an error if the minutes saved is not a number', async () => {
		const node = new TimeSaved();

		const executionFunctions = {
			getInputData: jest.fn().mockReturnValueOnce([{ json: {} }]),
			getNodeParameter: jest.fn().mockReturnValueOnce('fixed').mockReturnValueOnce('not a number'),
			continueOnFail: jest.fn().mockReturnValue(false),
			setMetadata: jest.fn(),
			getNode: jest.fn().mockReturnValue({
				name: 'TimeSaved',
				type: 'timeSaved',
			}),
		} as any as IExecuteFunctions;

		await expect(node.execute.call(executionFunctions)).rejects.toThrow(
			'Parameter "minutesSaved" is not number',
		);

		expect(executionFunctions.setMetadata).not.toHaveBeenCalled();
	});

	it('should continue on fail if the minutes saved is not a number and the config is set to continue on fail', async () => {
		const node = new TimeSaved();

		const executionFunctions = {
			getInputData: jest.fn().mockReturnValueOnce([{ json: {} }]),
			getNodeParameter: jest.fn().mockReturnValueOnce('fixed').mockReturnValueOnce(10),
			continueOnFail: jest.fn().mockReturnValue(true),
			setMetadata: jest.fn().mockImplementationOnce(() => {
				throw new Error('Test error');
			}),
			getNode: jest.fn().mockReturnValue({
				name: 'TimeSaved',
				type: 'timeSaved',
			}),
		} as any as IExecuteFunctions;

		const result = await node.execute.call(executionFunctions);

		expect(result[0].length).toEqual(1);
		expect(executionFunctions.continueOnFail).toHaveBeenCalled();
	});
});
