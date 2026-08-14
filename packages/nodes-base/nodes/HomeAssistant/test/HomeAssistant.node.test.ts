import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IPairedItemData,
} from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { HomeAssistant } from '../HomeAssistant.node';
import type { MockedFunction } from 'vitest';

vi.mock('../GenericFunctions');

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
		it('should not send an attributes property when no attributes are set', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					resource: 'state',
					operation: 'upsert',
					entityId: 'sensor.test',
					state: 'on',
					stateAttributes: {},
				};
				return params[paramName];
			});

			mockHomeAssistantApiRequest.mockResolvedValue({ entity_id: 'sensor.test', state: 'on' });

			await homeAssistant.execute.call(mockExecuteFunctions);

			expect(mockHomeAssistantApiRequest).toHaveBeenCalledWith(
				'POST',
				'/states/sensor.test',
				{ state: 'on' },
			);
			// The request body must not carry an (empty) attributes property when none are provided,
			// otherwise existing attributes on the entity would be wiped.
			const sentBody = mockHomeAssistantApiRequest.mock.calls[0][2] as IDataObject;
			expect(sentBody).not.toHaveProperty('attributes');
		});

		it('should send the provided attributes when they are set', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, unknown> = {
					resource: 'state',
					operation: 'upsert',
					entityId: 'sensor.test',
					state: 'on',
					stateAttributes: {
						attributes: [
							{ name: 'unit_of_measurement', value: '°C' },
							{ name: 'friendly_name', value: 'Test Sensor' },
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
				const params: Record<string, unknown> = {
					resource: 'state',
					operation: 'upsert',
					entityId: 'sensor.test',
					state: 'on',
					stateAttributes: {
						attributes: [
							{ name: '__proto__', value: { polluted: true } },
							{ name: 'friendly_name', value: 'Test Sensor' },
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
