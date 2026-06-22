import type { ITriggerFunctions } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { pgTriggerFunction } from '../PostgresTrigger.functions';
import type { PgpDatabase } from '../v2/helpers/interfaces';

describe('PostgresTrigger pgTriggerFunction', () => {
	it('should throw a friendly UserError for hyphenated names regardless of the server message locale', async () => {
		// Simulate a Postgres server with a non-English `lc_messages` locale: the
		// driver still reports SQLSTATE 42601, but the message text is localized
		// (German here) and does not contain the English substring `near "-"`.
		const localizedSyntaxError = Object.assign(new Error('Syntaxfehler bei »-«'), {
			code: '42601',
		});

		const db = mock<PgpDatabase>();
		db.any.mockRejectedValue(localizedSyntaxError);

		const triggerFunctions = mock<ITriggerFunctions>();
		triggerFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
			switch (parameterName) {
				case 'schema':
					return 'public';
				case 'tableName':
					return 'my_table';
				case 'firesOn':
					return 'INSERT';
				default:
					return undefined;
			}
		});

		const additionalFields = { triggerName: 'my-trigger' };

		await expect(
			pgTriggerFunction.call(
				triggerFunctions,
				db,
				additionalFields,
				'n8n_trigger_function_test()',
				'my-trigger',
				'n8n_channel_test',
			),
		).rejects.toThrowError(new UserError('Names cannot contain hyphens (-)'));
	});
});
