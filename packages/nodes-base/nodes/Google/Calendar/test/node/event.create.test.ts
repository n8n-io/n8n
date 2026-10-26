import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
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
		executeFunctions.helpers.constructExecutionMetaData.mockImplementation((data, { itemData }) =>
			data.map((item) => ({ ...item, pairedItem: itemData })),
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
			[{ json: createdEvent, pairedItem: { item: 0 } }],
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

	it('should create an event with an empty attendee list', async () => {
		setupCreate({ attendees: [] });

		await googleCalendar.execute.call(executeFunctions);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/calendar/v3/calendars/primary/events',
			expect.objectContaining({ attendees: [] }),
			{},
		);
	});

	it.each([
		{ attendees: [''] },
		{ attendees: [' \t\n '] },
		{ attendees: ['alice@example.com,'] },
		{ attendees: [',alice@example.com'] },
		{ attendees: ['alice@example.com,,bob@example.com'] },
		{ attendees: ['alice@example.com, \t ,bob@example.com'] },
		{ attendees: ['alice@example.com', ''] },
	])('should report a node error for blank attendee entries: $attendees', async ({ attendees }) => {
		setupCreate({ attendees });

		const execution = googleCalendar.execute.call(executeFunctions);

		await expect(execution).rejects.toBeInstanceOf(NodeOperationError);
		await expect(execution).rejects.toMatchObject({
			message: 'Invalid attendee value',
			context: { itemIndex: 0 },
		});
		expect(genericFunctions.googleApiRequest).not.toHaveBeenCalled();
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

	it.each([null, 42, false, ['alice@example.com']])(
		'should report a node error for a non-string attendee: %j',
		async (attendee) => {
			setupCreate({ attendees: [attendee] });

			const execution = googleCalendar.execute.call(executeFunctions);

			await expect(execution).rejects.toBeInstanceOf(NodeOperationError);
			await expect(execution).rejects.toMatchObject({ context: { itemIndex: 0 } });
			expect(genericFunctions.googleApiRequest).not.toHaveBeenCalled();
		},
	);

	it.each([{ email: 'alice@example.com' }, 'alice@example.com', 42, true])(
		'should report a node error when the attendee list is not an array: %j',
		async (attendees) => {
			setupCreate({ attendees });

			await expect(googleCalendar.execute.call(executeFunctions)).rejects.toBeInstanceOf(
				NodeOperationError,
			);
			expect(genericFunctions.googleApiRequest).not.toHaveBeenCalled();
		},
	);

	it('should identify the input item with an invalid attendee', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		setupCreate({ attendees: ['alice@example.com'] });
		executeFunctions.getNodeParameter
			.mockReturnValueOnce('primary')
			.mockReturnValueOnce('2026-07-18T09:00:00Z')
			.mockReturnValueOnce('2026-07-18T10:00:00Z')
			.mockReturnValueOnce(true)
			.mockReturnValueOnce({ attendees: [{ email: 'bob@example.com' }] });

		await expect(googleCalendar.execute.call(executeFunctions)).rejects.toMatchObject({
			context: { itemIndex: 1 },
		});
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);
	});

	it('should return the attendee error when continue on fail is enabled', async () => {
		setupCreate({ attendees: [{ email: 'alice@example.com' }] });
		executeFunctions.continueOnFail.mockReturnValue(true);
		executeFunctions.helpers.returnJsonArray.mockImplementation((data) => [
			{ json: data as IDataObject },
		]);

		await expect(googleCalendar.execute.call(executeFunctions)).resolves.toEqual([
			[
				{
					json: { error: 'Invalid attendee value' },
					pairedItem: { item: 0 },
				},
			],
		]);
		expect(genericFunctions.googleApiRequest).not.toHaveBeenCalled();
	});
});
