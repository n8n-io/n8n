import type { NodeOperationAnnotations } from 'n8n-workflow';
import {
	isINodePropertyOptionsList,
	READ_ONLY_ANNOTATIONS,
	resolveNodeAnnotations,
	SEND_AND_WAIT_OPERATION,
} from 'n8n-workflow';

import { Slack } from '../Slack.node';

const additiveWrite: NodeOperationAnnotations = {
	effect: 'write',
	destructive: false,
	idempotent: false,
};
const destructiveWrite: NodeOperationAnnotations = {
	effect: 'write',
	destructive: true,
	idempotent: false,
};
const idempotentWrite: NodeOperationAnnotations = {
	effect: 'write',
	destructive: true,
	idempotent: true,
};

type OperationCase = [resource: string, operation: string, expected: NodeOperationAnnotations];

const commonCases: OperationCase[] = [
	['channel', 'archive', destructiveWrite],
	['channel', 'close', idempotentWrite],
	['channel', 'create', additiveWrite],
	['channel', 'get', READ_ONLY_ANNOTATIONS],
	['channel', 'getAll', READ_ONLY_ANNOTATIONS],
	['channel', 'history', READ_ONLY_ANNOTATIONS],
	['channel', 'invite', additiveWrite],
	['channel', 'join', { effect: 'write', destructive: false, idempotent: true }],
	['channel', 'kick', destructiveWrite],
	['channel', 'leave', destructiveWrite],
	['channel', 'member', READ_ONLY_ANNOTATIONS],
	['channel', 'open', idempotentWrite],
	['channel', 'rename', destructiveWrite],
	['channel', 'replies', READ_ONLY_ANNOTATIONS],
	['channel', 'setPurpose', destructiveWrite],
	['channel', 'setTopic', destructiveWrite],
	['channel', 'unarchive', destructiveWrite],
	['message', 'delete', destructiveWrite],
	['message', 'getPermalink', READ_ONLY_ANNOTATIONS],
	['message', 'post', additiveWrite],
	['message', 'update', destructiveWrite],
	['star', 'add', additiveWrite],
	['star', 'delete', destructiveWrite],
	['star', 'getAll', READ_ONLY_ANNOTATIONS],
	['file', 'get', READ_ONLY_ANNOTATIONS],
	['file', 'getAll', READ_ONLY_ANNOTATIONS],
	['file', 'upload', additiveWrite],
	['reaction', 'add', additiveWrite],
	['reaction', 'get', READ_ONLY_ANNOTATIONS],
	['reaction', 'remove', destructiveWrite],
	['user', 'info', READ_ONLY_ANNOTATIONS],
	['user', 'getAll', READ_ONLY_ANNOTATIONS],
	['user', 'getPresence', READ_ONLY_ANNOTATIONS],
	['userGroup', 'create', additiveWrite],
	['userGroup', 'disable', destructiveWrite],
	['userGroup', 'enable', destructiveWrite],
	['userGroup', 'getAll', READ_ONLY_ANNOTATIONS],
	['userGroup', 'update', destructiveWrite],
];

const v1Cases: OperationCase[] = [
	['message', 'postEphemeral', additiveWrite],
	['userProfile', 'get', READ_ONLY_ANNOTATIONS],
	['userProfile', 'update', destructiveWrite],
];

const v2Cases: OperationCase[] = [
	['message', 'deleteScheduled', destructiveWrite],
	['message', 'getManyScheduled', READ_ONLY_ANNOTATIONS],
	['message', 'schedule', additiveWrite],
	['message', 'search', READ_ONLY_ANNOTATIONS],
	['message', SEND_AND_WAIT_OPERATION, additiveWrite],
	['user', 'getProfile', READ_ONLY_ANNOTATIONS],
	['user', 'lookupByEmail', READ_ONLY_ANNOTATIONS],
	['user', 'updateProfile', destructiveWrite],
	['userGroup', 'updateUsers', destructiveWrite],
	['userGroup', 'getUsers', READ_ONLY_ANNOTATIONS],
];

describe('Slack, annotations', () => {
	const slack = new Slack();

	describe.each([1, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7])('version %s', (typeVersion) => {
		const { description } = slack.getNodeType(typeVersion);
		const cases = [...commonCases, ...(typeVersion === 1 ? v1Cases : v2Cases)];

		it.each(cases)('should resolve %s/%s', (resource, operation, expected) => {
			expect(
				resolveNodeAnnotations(description, { parameters: { resource, operation }, typeVersion }),
			).toEqual(expected);
		});

		it('should annotate every declared operation', () => {
			const operations = description.properties
				.filter((property) => property.name === 'operation')
				.flatMap((property) => {
					if (!isINodePropertyOptionsList(property.options)) return [];
					return property.options.map((option) => [
						property.displayOptions?.show?.resource?.[0],
						option.value,
						option.annotations,
					]);
				});

			expect(operations).toHaveLength(cases.length);
			expect(operations).toEqual(expect.arrayContaining(cases));
		});

		it('should resolve the default operation as an additive write', () => {
			expect(resolveNodeAnnotations(description, { parameters: {}, typeVersion })).toEqual(
				additiveWrite,
			);
		});

		it.each(['unknown', '={{ $json.operation }}'])(
			'should keep restrictive annotations for operation %s',
			(operation) => {
				expect(
					resolveNodeAnnotations(description, {
						parameters: { resource: 'channel', operation },
						typeVersion,
					}),
				).toEqual(destructiveWrite);
			},
		);
	});
});
