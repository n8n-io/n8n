import type { INodeParameters, INodeTypeDescription } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { SlackV2 } from '../../V2/SlackV2.node';

const node = { typeVersion: 2.7 };

// Mirrors useNodeSettingsParameters.setValue in the editor: strip defaults,
// apply the change, then fill defaults again.
function changeParameter(
	description: INodeTypeDescription,
	current: INodeParameters,
	name: string,
	value: unknown,
) {
	const withoutDefaults =
		NodeHelpers.getNodeParameters(
			description.properties,
			current,
			false,
			false,
			node,
			description,
		) ?? {};
	withoutDefaults[name] = value as INodeParameters[string];
	return (
		NodeHelpers.getNodeParameters(
			description.properties,
			withoutDefaults,
			true,
			false,
			node,
			description,
		) ?? {}
	);
}

const pickedChannel = { __rl: true, mode: 'id', value: 'C0123ABC' };

describe('ChannelDescription', () => {
	const description = new SlackV2({
		displayName: 'Slack',
		name: 'slack',
		group: ['output'],
		description: 'Consume Slack API',
	}).description;

	let params: INodeParameters;

	beforeEach(() => {
		params =
			NodeHelpers.getNodeParameters(description.properties, {}, true, false, node, description) ??
			{};
	});

	it('channel:create keeps a string channel name after picking a channel on message:post', () => {
		params = changeParameter(description, params, 'select', 'channel');
		params = changeParameter(description, params, 'channelId', pickedChannel);
		params = changeParameter(description, params, 'resource', 'channel');

		expect(params.operation).toBe('create');
		expect(typeof params.channelId).toBe('string');
	});

	it('channel:create keeps a string channel name after picking a channel on channel:get', () => {
		params = changeParameter(description, params, 'resource', 'channel');
		params = changeParameter(description, params, 'operation', 'get');
		params = changeParameter(description, params, 'channelId', pickedChannel);
		params = changeParameter(description, params, 'operation', 'create');

		expect(typeof params.channelId).toBe('string');
	});
});
