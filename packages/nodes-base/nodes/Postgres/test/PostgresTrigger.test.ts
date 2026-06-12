import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, ITriggerFunctions } from 'n8n-workflow';
import pgPromise from 'pg-promise';

import {
	pgTriggerFunction,
	prepareNames,
	validatePostgresIdentifier,
} from '../PostgresTrigger.functions';
import { PostgresTrigger } from '../PostgresTrigger.node';
import type { PgpDatabase } from '../v2/helpers/interfaces';

const mockConnect = jest.fn();

jest.mock('../transport', () => ({
	configurePostgres: jest.fn(() => ({ db: { connect: mockConnect } })),
}));

const pgp = pgPromise();

describe('PostgresTrigger', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('prepareNames', () => {
		it('should return default names with normalized function name', () => {
			expect(prepareNames('node-id', 'trigger', {})).toEqual({
				functionName: 'n8n_trigger_function_node_id',
				triggerName: 'n8n_trigger_node_id',
				channelName: 'n8n_channel_node_id',
			});
		});

		it('should normalize custom function names with empty call suffix', () => {
			expect(
				prepareNames('node-id', 'trigger', {
					functionName: 'custom_function()',
					triggerName: 'custom_trigger',
					channelName: 'custom_channel',
				}),
			).toEqual({
				functionName: 'custom_function',
				triggerName: 'custom_trigger',
				channelName: 'custom_channel',
			});
		});

		it('should reject identifiers with unsupported characters', () => {
			expect(() =>
				prepareNames('node-id', 'trigger', {
					functionName: 'custom-function',
				}),
			).toThrow(
				'Function name must start with a letter or underscore and contain only letters, digits, and underscores',
			);

			expect(() => validatePostgresIdentifier('123_channel', 'Channel name')).toThrow(
				'Channel name must start with a letter or underscore and contain only letters, digits, and underscores',
			);
		});
	});

	describe('pgTriggerFunction', () => {
		it('should format trigger setup queries with escaped identifiers', async () => {
			const any = jest.fn().mockResolvedValue([]);
			const db = { any } as unknown as PgpDatabase;
			const triggerFunctions = mockDeep<ITriggerFunctions>();

			triggerFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const parameters: Record<string, unknown> = {
					schema: 'public',
					tableName: 'users',
					firesOn: 'INSERT',
				};

				return parameters[parameterName] as never;
			});

			await pgTriggerFunction.call(
				triggerFunctions,
				db,
				{},
				'custom_function',
				'custom_trigger',
				'custom_channel',
			);

			const formattedQueries = any.mock.calls.map(([query, values]) =>
				pgp.as.format(query, values as IDataObject[]),
			);

			expect(formattedQueries).toEqual([
				"CREATE OR REPLACE FUNCTION \"custom_function\"() RETURNS trigger LANGUAGE 'plpgsql' COST 100 VOLATILE NOT LEAKPROOF AS $BODY$ begin perform pg_notify('custom_channel', row_to_json(NEW)::text); return null; end; $BODY$;",
				'DROP TRIGGER IF EXISTS "custom_trigger" ON "public"."users"',
				'CREATE TRIGGER "custom_trigger" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "custom_function"()',
			]);
		});
	});

	describe('trigger', () => {
		it('should format existing channel listener with identifier placeholder', async () => {
			const connection = {
				none: jest.fn().mockResolvedValue(undefined),
				client: {
					on: jest.fn(),
					removeListener: jest.fn(),
				},
			};
			mockConnect.mockResolvedValue(connection);

			const triggerFunctions = mockDeep<ITriggerFunctions>();
			triggerFunctions.getMode.mockReturnValue('trigger');
			triggerFunctions.getNode.mockReturnValue({
				id: 'node-id',
				name: 'Postgres Trigger',
				type: 'n8n-nodes-base.postgresTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});
			triggerFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
				const parameters: Record<string, unknown> = {
					triggerMode: 'listenTrigger',
					additionalFields: {},
					channelName: 'existing_channel',
				};

				return parameters[parameterName] as never;
			});

			const node = new PostgresTrigger();

			await node.trigger.call(triggerFunctions);

			expect(connection.none).toHaveBeenCalledWith('LISTEN $1:name', ['existing_channel']);
		});
	});
});
