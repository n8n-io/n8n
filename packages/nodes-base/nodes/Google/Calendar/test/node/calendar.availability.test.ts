import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';
import type * as GenericFunctions from '../../GenericFunctions';

jest.mock('../../GenericFunctions', () => {
	const originalModule = jest.requireActual<typeof GenericFunctions>('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: jest.fn(),
	};
});

describe('Google Calendar Node > Calendar > Availability', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it.each([1.3, 1.4])(
		'should send the decoded calendar ID in the request body in version %s',
		async (typeVersion) => {
			jest.mocked(genericFunctions.googleApiRequest).mockResolvedValue({
				calendars: { 'team@example.com': { busy: [] } },
			});
			const executeFunctions = mock<IExecuteFunctions>({
				getInputData: jest.fn().mockReturnValue([{ json: {} }]),
				getNode: jest.fn().mockReturnValue(mock<INode>({ typeVersion })),
				getTimezone: jest.fn().mockReturnValue('Europe/Berlin'),
				helpers: { constructExecutionMetaData: jest.fn().mockReturnValue([]) },
			});
			executeFunctions.getNodeParameter.mockImplementation(((name: string) => {
				const parameters: Record<string, unknown> = {
					resource: 'calendar',
					operation: 'availability',
					calendar: 'team%40example.com',
					timeMin: '2024-01-01T00:00:00Z',
					timeMax: '2024-01-02T00:00:00Z',
					options: { outputFormat: 'availability' },
				};
				return parameters[name];
			}) as IExecuteFunctions['getNodeParameter']);

			await new GoogleCalendar().execute.call(executeFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'POST',
				expect.anything(),
				expect.objectContaining({ items: [{ id: 'team@example.com' }] }),
				{},
			);
		},
	);
});
