import type { IDataObject, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';

describe('Google Calendar > Event > Create', () => {
	const googleCalendar = new GoogleCalendar();
	const createdEvent = { id: 'test-event' };
	let executeFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	beforeEach(() => {
		vi.spyOn(genericFunctions, 'googleApiRequest').mockResolvedValue(createdEvent);
		executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue(
			mock<INode>({
				name: 'Google Calendar',
				type: 'n8n-nodes-base.googleCalendar',
				typeVersion: 1.3,
			}),
		);
		executeFunctions.getTimezone.mockReturnValue('UTC');
		executeFunctions.continueOnFail.mockReturnValue(false);
		executeFunctions.helpers.returnJsonArray.mockReturnValue([{ json: createdEvent }]);
		executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
			(data: INodeExecutionData[]) => data,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const setupCreate = (additionalFields: IDataObject) => {
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('event')
			.mockReturnValueOnce('create')
			.mockReturnValueOnce('primary')
			.mockReturnValueOnce('2026-07-18T09:00:00Z')
			.mockReturnValueOnce('2026-07-18T10:00:00Z')
			.mockReturnValueOnce(true)
			.mockReturnValueOnce(additionalFields);
	};

	it('should create an event with email strings and comma-separated attendees', async () => {
		setupCreate({
			attendees: ['alice@example.com, bob@example.com', 'carol@example.com'],
		});

		await expect(googleCalendar.execute.call(executeFunctions)).resolves.toEqual([
			[{ json: createdEvent }],
		]);
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/calendar/v3/calendars/primary/events',
			expect.objectContaining({
				attendees: [
					{ email: 'alice@example.com' },
					{ email: 'bob@example.com' },
					{ email: 'carol@example.com' },
				],
			}),
			{},
		);
	});

	it('should report a node error when an attendee expression returns an object', async () => {
		// NODE-5494: An attendee expression can return an object instead of an email string.
		setupCreate({ attendees: [{ email: 'alice@example.com' }] });

		const execution = googleCalendar.execute.call(executeFunctions);

		await expect(execution).rejects.toBeInstanceOf(NodeOperationError);
		await expect(execution).rejects.toMatchObject({
			message: expect.stringMatching(/attendee/i),
			context: { itemIndex: 0 },
		});
		expect(genericFunctions.googleApiRequest).not.toHaveBeenCalled();
	});
});
