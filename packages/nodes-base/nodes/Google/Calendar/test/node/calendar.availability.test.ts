import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: vi.fn(),
	};
});

describe('Google Calendar Node > Calendar > Availability', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it.each([1.3, 1.4])(
		'should send the decoded calendar ID in the request body in version %s',
		async (typeVersion) => {
			vi.mocked(genericFunctions.googleApiRequest).mockResolvedValue({
				calendars: { 'team@example.com': { busy: [] } },
			});
			const executeFunctions = mock<IExecuteFunctions>({
				getInputData: vi.fn().mockReturnValue([{ json: {} }]),
				getNode: vi.fn().mockReturnValue(mock<INode>({ typeVersion })),
				getTimezone: vi.fn().mockReturnValue('Europe/Berlin'),
				helpers: { constructExecutionMetaData: vi.fn().mockReturnValue([]) },
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
