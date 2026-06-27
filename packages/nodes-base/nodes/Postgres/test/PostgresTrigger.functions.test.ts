import type { IDataObject, ITriggerFunctions } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { pgTriggerFunction, prepareNames } from '../PostgresTrigger.functions';
import type { PgpDatabase } from '../v2/helpers/interfaces';

function mockTriggerFunctions() {
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
	return triggerFunctions;
}

describe('PostgresTrigger pgTriggerFunction', () => {
	const hyphenError = new UserError('Names cannot contain hyphens (-)', { level: 'warning' });

	it('should throw a friendly UserError for a hyphenated trigger name regardless of the server message locale', async () => {
		// Simulate a Postgres server with a non-English `lc_messages` locale: the
		// driver still reports SQLSTATE 42601, but the message text is localized
		// (German here) and does not contain the English substring `near "-"`.
		const localizedSyntaxError = Object.assign(new Error('Syntaxfehler bei »-«'), {
			code: '42601',
		});

		const db = mock<PgpDatabase>();
		db.any.mockRejectedValue(localizedSyntaxError);

		const additionalFields = { triggerName: 'my-trigger' };

		await expect(
			pgTriggerFunction.call(
				mockTriggerFunctions(),
				db,
				additionalFields,
				'n8n_trigger_function_test()',
				'my-trigger',
				'n8n_channel_test',
			),
		).rejects.toThrowError(hyphenError);

		// The guard runs before any SQL, so the (localized) DB error is never reached.
		expect(db.any).not.toHaveBeenCalled();
	});

	it('should throw a friendly UserError for a hyphenated function name', async () => {
		const db = mock<PgpDatabase>();
		const additionalFields = { functionName: 'my-function()' };

		await expect(
			pgTriggerFunction.call(
				mockTriggerFunctions(),
				db,
				additionalFields,
				'my-function()',
				'n8n_trigger_test',
				'n8n_channel_test',
			),
		).rejects.toThrowError(hyphenError);

		expect(db.any).not.toHaveBeenCalled();
	});

	it('should throw a friendly UserError for a hyphenated channel name', async () => {
		const db = mock<PgpDatabase>();

		await expect(
			pgTriggerFunction.call(
				mockTriggerFunctions(),
				db,
				{},
				'n8n_trigger_function_test()',
				'n8n_trigger_test',
				'my-channel',
			),
		).rejects.toThrowError(
			new UserError('Channel name cannot contain hyphens (-)', { level: 'warning' }),
		);

		expect(db.any).not.toHaveBeenCalled();
	});

	it('should create-or-replace the function and (re)create the trigger when no custom names are given', async () => {
		const db = mock<PgpDatabase>();
		db.any.mockResolvedValue([]);

		await pgTriggerFunction.call(
			mockTriggerFunctions(),
			db,
			{},
			'n8n_trigger_function_test()',
			'n8n_trigger_test',
			'n8n_channel_test',
		);

		expect(db.any).toHaveBeenCalledTimes(3);
		expect(db.any).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining('CREATE OR REPLACE FUNCTION'),
			['n8n_trigger_function_test()', 'n8n_channel_test', 'new'],
		);
		expect(db.any).toHaveBeenNthCalledWith(2, expect.stringContaining('DROP TRIGGER IF EXISTS'), [
			'n8n_trigger_test',
			'public."my_table"',
			'new',
		]);
		expect(db.any).toHaveBeenNthCalledWith(3, expect.stringContaining('CREATE TRIGGER'), [
			'public."my_table"',
			'n8n_trigger_function_test()',
			'INSERT',
			'n8n_trigger_test',
		]);
	});

	it('should only create the function (not replace/drop) when a custom name is given without replaceIfExists', async () => {
		const db = mock<PgpDatabase>();
		db.any.mockResolvedValue([]);

		await pgTriggerFunction.call(
			mockTriggerFunctions(),
			db,
			{ triggerName: 'n8n_trigger_test' },
			'n8n_trigger_function_test()',
			'n8n_trigger_test',
			'n8n_channel_test',
		);

		expect(db.any).toHaveBeenCalledTimes(2);
		expect(db.any).toHaveBeenNthCalledWith(1, expect.stringContaining('CREATE FUNCTION'), [
			'n8n_trigger_function_test()',
			'n8n_channel_test',
			'new',
		]);
		expect(db.any).toHaveBeenNthCalledWith(2, expect.stringContaining('CREATE TRIGGER'), [
			'public."my_table"',
			'n8n_trigger_function_test()',
			'INSERT',
			'n8n_trigger_test',
		]);
	});

	it('should create-or-replace the function when replaceIfExists is set even with a custom name', async () => {
		const db = mock<PgpDatabase>();
		db.any.mockResolvedValue([]);

		await pgTriggerFunction.call(
			mockTriggerFunctions(),
			db,
			{ triggerName: 'n8n_trigger_test', replaceIfExists: true },
			'n8n_trigger_function_test()',
			'n8n_trigger_test',
			'n8n_channel_test',
		);

		expect(db.any).toHaveBeenCalledTimes(3);
		expect(db.any).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining('CREATE OR REPLACE FUNCTION'),
			expect.anything(),
		);
	});
});

describe('PostgresTrigger prepareNames', () => {
	const hyphenError = new UserError('Names cannot contain hyphens (-)', { level: 'warning' });

	it('should throw for a hyphenated function name', () => {
		expect(() =>
			prepareNames('node-id', 'trigger', { functionName: 'my-function' } as IDataObject),
		).toThrowError(hyphenError);
	});

	it('should throw for a hyphenated trigger name', () => {
		expect(() =>
			prepareNames('node-id', 'trigger', { triggerName: 'my-trigger' } as IDataObject),
		).toThrowError(hyphenError);
	});

	it('should throw for a hyphenated channel name', () => {
		expect(() =>
			prepareNames('node-id', 'trigger', { channelName: 'my-channel' } as IDataObject),
		).toThrowError(new UserError('Channel name cannot contain hyphens (-)', { level: 'warning' }));
	});

	it('should derive valid default names from the node id without hyphens', () => {
		const { functionName, triggerName, channelName } = prepareNames('abc-123-def', 'trigger', {});

		expect(functionName).toBe('n8n_trigger_function_abc_123_def()');
		expect(triggerName).toBe('n8n_trigger_abc_123_def');
		expect(channelName).toBe('n8n_channel_abc_123_def');
	});

	it('should append a manual suffix in manual mode', () => {
		const { functionName, triggerName, channelName } = prepareNames('abc', 'manual', {});

		expect(functionName).toBe('n8n_trigger_function_abc_manual()');
		expect(triggerName).toBe('n8n_trigger_abc_manual');
		expect(channelName).toBe('n8n_channel_abc_manual');
	});
});
