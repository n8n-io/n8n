import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { HomeAssistant } from '../HomeAssistant.node';
import type { MockedFunction } from 'vitest';

vi.mock('../GenericFunctions');

const attribute = (name: string, value: IDataObject[keyof IDataObject]): IDataObject => ({
	name,
	value,
});

describe('HomeAssistant Node', () => {
	let homeAssistant: HomeAssistant;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	const mockHomeAssistantApiRequest = GenericFunctions.homeAssistantApiRequest as MockedFunction<
		typeof GenericFunctions.homeAssistantApiRequest
	>;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Home Assistant',
		type: 'n8n-nodes-base.homeAssistant',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		homeAssistant = new HomeAssistant();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			helpers: {
				constructExecutionMetaData: vi.fn(
					(
						data: INodeExecutionData[],
						options: { itemData: IPairedItemData | IPairedItemData[] },
					) => {
						const itemIndex =
							(Array.isArray(options?.itemData)
								? options.itemData[0]?.item
								: options?.itemData?.item) ?? 0;
						return data.map((item) => ({ ...item, pairedItem: { item: itemIndex } }));
					},
				),
				returnJsonArray: vi.fn((data: IDataObject | IDataObject[]) =>
					Array.isArray(data) ? data.map((d) => ({ json: d })) : [{ json: data }],
				),
			},
		});

		vi.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('State resource - upsert', () => {
		const noAttributesParams: IDataObject = {
			resource: 'state',
			operation: 'upsert',
			entityId: 'sensor.test',
			state: 'off',
			stateAttributes: {},
		};

		it('should keep the existing attributes when no attributes are set', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string) => noAttributesParams[paramName],
			);

			const existingAttributes = { unit_of_measurement: '°C', friendly_name: 'Test Sensor' };
			mockHomeAssistantApiRequest
				.mockResolvedValueOnce({
					entity_id: 'sensor.test',
					state: 'on',
					attributes: existingAttributes,
				})
				.mockResolvedValueOnce({ entity_id: 'sensor.test', state: 'off' });

			await homeAssistant.execute.call(mockExecuteFunctions);

			expect(mockHomeAssistantApiRequest).toHaveBeenNthCalledWith(1, 'GET', '/states/sensor.test');
			expect(mockHomeAssistantApiRequest).toHaveBeenNthCalledWith(
				2,
				'POST',
				'/states/sensor.test',
				{
					state: 'off',
					attributes: existingAttributes,
				},
			);
		});

		it('should keep the existing attributes when the attribute list is empty', async () => {
			// Adding attribute rows and deleting them again stores an empty list
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string) =>
					({ ...noAttributesParams, stateAttributes: { attributes: [] } })[paramName],
			);

			const existingAttributes = { unit_of_measurement: '°C', friendly_name: 'Test Sensor' };
			mockHomeAssistantApiRequest
				.mockResolvedValueOnce({
					entity_id: 'sensor.test',
					state: 'on',
					attributes: existingAttributes,
				})
				.mockResolvedValueOnce({ entity_id: 'sensor.test', state: 'off' });

			await homeAssistant.execute.call(mockExecuteFunctions);

			expect(mockHomeAssistantApiRequest).toHaveBeenNthCalledWith(1, 'GET', '/states/sensor.test');
			expect(mockHomeAssistantApiRequest).toHaveBeenNthCalledWith(
				2,
				'POST',
				'/states/sensor.test',
				{
					state: 'off',
					attributes: existingAttributes,
				},
			);
		});

		it('should not send attributes when the entity does not exist yet', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string) => noAttributesParams[paramName],
			);

			mockHomeAssistantApiRequest
				.mockRejectedValueOnce(new NodeApiError(mockNode, { statusCode: 404 }))
				.mockResolvedValueOnce({ entity_id: 'sensor.test', state: 'off' });

			await homeAssistant.execute.call(mockExecuteFunctions);

			expect(mockHomeAssistantApiRequest).toHaveBeenNthCalledWith(
				2,
				'POST',
				'/states/sensor.test',
				{
					state: 'off',
				},
			);
		});

		it('should rethrow errors other than 404 when reading the current state', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string) => noAttributesParams[paramName],
			);

			mockHomeAssistantApiRequest.mockRejectedValueOnce(
				new NodeApiError(mockNode, { statusCode: 401 }),
			);

			await expect(homeAssistant.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeApiError);
			expect(mockHomeAssistantApiRequest).toHaveBeenCalledTimes(1);
		});

		it('should send the provided attributes when they are set', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: IDataObject = {
					resource: 'state',
					operation: 'upsert',
					entityId: 'sensor.test',
					state: 'on',
					stateAttributes: {
						attributes: [
							attribute('unit_of_measurement', '°C'),
							attribute('friendly_name', 'Test Sensor'),
						],
					},
				};
				return params[paramName];
			});

			mockHomeAssistantApiRequest.mockResolvedValue({ entity_id: 'sensor.test', state: 'on' });

			await homeAssistant.execute.call(mockExecuteFunctions);

			expect(mockHomeAssistantApiRequest).toHaveBeenCalledWith('POST', '/states/sensor.test', {
				state: 'on',
				attributes: {
					unit_of_measurement: '°C',
					friendly_name: 'Test Sensor',
				},
			});
		});

		it('should not write unsafe prototype-polluting attribute keys', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: IDataObject = {
					resource: 'state',
					operation: 'upsert',
					entityId: 'sensor.test',
					state: 'on',
					stateAttributes: {
						attributes: [
							attribute('__proto__', { polluted: true }),
							attribute('friendly_name', 'Test Sensor'),
						],
					},
				};
				return params[paramName];
			});

			mockHomeAssistantApiRequest.mockResolvedValue({ entity_id: 'sensor.test', state: 'on' });

			await homeAssistant.execute.call(mockExecuteFunctions);

			const sentBody = mockHomeAssistantApiRequest.mock.calls[0][2] as {
				attributes: IDataObject;
			};
			// The unsafe key must be skipped, and safe keys still written.
			expect(Object.prototype.hasOwnProperty.call(sentBody.attributes, '__proto__')).toBe(false);
			expect(sentBody.attributes).toEqual({ friendly_name: 'Test Sensor' });
			// An unsafe assignment would reparent the object's prototype; the safe write leaves it intact.
			expect(Object.getPrototypeOf(sentBody.attributes)).toBe(Object.prototype);
			expect((sentBody.attributes as IDataObject).polluted).toBeUndefined();
		});
	});
});
