import type {
	INodeParameters,
	INodeProperties,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { KafkaTriggerV1 } from '../../v1/KafkaTriggerV1.node';
import { KafkaTriggerV2 } from '../../v2/KafkaTriggerV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Kafka Trigger',
	name: 'kafkaTrigger',
	icon: { light: 'file:kafka.svg', dark: 'file:kafka.dark.svg' },
	group: ['trigger'],
	defaultVersion: 1.3,
	description: 'Consume messages from a Kafka topic',
};

/**
 * v1.3 options v2 does not carry, because none of them could do anything here.
 * Auto Commit Threshold has no equivalent in the new library. Each Batch Auto
 * Resolve cannot be honoured: the consume loop resolves offsets chunk by chunk
 * and turns the library's automatic resolution off, so obeying it would mark
 * messages read that no execution ever saw. Allow Topic Creation reaches
 * librdkafka but changed nothing when measured against a real broker, with the
 * flag on or off.
 */
const DROPPED_IN_V2 = ['autoCommitThreshold', 'eachBatchAutoResolve', 'allowAutoTopicCreation'];

/** v2 adds no options of its own; it only drops the three above. */
const ADDED_IN_V2: string[] = [];

/** The entries of the `options` collection on a resolved node description. */
function optionEntries(description: INodeTypeDescription): INodeProperties[] {
	const collection = description.properties.find((property) => property.name === 'options');
	if (!collection?.options) throw new Error('the description declares no Options collection');
	return collection.options as INodeProperties[];
}

/**
 * The option names a user actually sees at a given `typeVersion`.
 *
 * v1's raw array holds every minor version's fields at once, including two
 * entries both named `heartbeatInterval` and a `parallelProcessing` restricted
 * to 1.1 and 1.2, so it cannot be compared directly. `displayParameter` is what
 * n8n itself uses to decide visibility, so the version predicates are resolved
 * the same way here rather than being restated by hand.
 *
 * The sibling values below are chosen so every predicate that depends on another
 * field rather than on the version resolves to visible: Only Message needs JSON
 * Parse Message on, and Retry Delay on Error is hidden only for the
 * `immediately` offset mode. This is the full set a user could see, so nothing
 * is missed for depending on a sibling.
 */
function visibleOptionNames(description: INodeTypeDescription, typeVersion: number): string[] {
	const values: INodeParameters = { jsonParseMessage: true };
	const root: INodeParameters = { ...values, resolveOffset: 'onCompletion' };

	return optionEntries(description)
		.filter((option) =>
			NodeHelpers.displayParameter(values, option, { typeVersion }, description, root),
		)
		.map((option) => option.name);
}

describe('KafkaTriggerV2 description', () => {
	const v13 = new KafkaTriggerV1(baseDescription).description;
	const v2 = new KafkaTriggerV2(baseDescription).description;

	it('carries every v1.3 option except the three that control nothing', () => {
		const expected = visibleOptionNames(v13, 1.3).filter((name) => !DROPPED_IN_V2.includes(name));
		const actual = visibleOptionNames(v2, 2).filter((name) => !ADDED_IN_V2.includes(name));

		expect(actual).toStrictEqual(expected);
	});

	it('differs from v1.3 by exactly the documented options, and nothing else', () => {
		const v13Visible = visibleOptionNames(v13, 1.3);
		const v2Visible = visibleOptionNames(v2, 2);

		// Guards the helper itself: if the version resolution ever silently returned
		// nothing, the assertion above would pass against two empty lists.
		expect(v13Visible.length).toBeGreaterThan(10);
		expect(v13Visible).toEqual(expect.arrayContaining(DROPPED_IN_V2));
		// Sorted: this is about which names differ, not declaration order.
		expect(v13Visible.filter((name) => !v2Visible.includes(name)).sort()).toStrictEqual(
			[...DROPPED_IN_V2].sort(),
		);
		expect(v2Visible.filter((name) => !v13Visible.includes(name)).sort()).toStrictEqual(
			[...ADDED_IN_V2].sort(),
		);
	});

	it('never shows Parallel Processing, which v1 restricts to 1.1 and 1.2', () => {
		expect(visibleOptionNames(v2, 2)).not.toContain('parallelProcessing');
	});
});
