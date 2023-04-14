import type { INode } from 'n8n-workflow';
import { prepareTimestamp } from '../../GenericFunctions';

import { DateTime } from 'luxon';

const node: INode = {
	id: '1',
	name: 'Gmail node',
	typeVersion: 2,
	type: 'n8n-nodes-base.gmail',
	position: [50, 50],
	parameters: {
		operation: 'getAll',
	},
};

describe('Google Gmail v2, prepareTimestamp', () => {
	it('should return a valid timestamp from ISO', () => {
		const dateInput = '2020-01-01T00:00:00.000Z';
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from integer in miliseconds', () => {
		const dateInput = 1577836800000;
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from integer in seconds', () => {
		const dateInput = 1577836800;
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from string in miliseconds', () => {
		const dateInput = '1577836800000';
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from string in seconds', () => {
		const dateInput = '1577836800';
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from luxon DateTime', () => {
		const dateInput = DateTime.fromISO('2020-01-01T00:00:00.000Z');
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should return a valid timestamp from luxon DateTime ISO', () => {
		const dateInput = DateTime.fromISO('2020-01-01T00:00:00.000Z').toISO();
		const timestampBefore = prepareTimestamp(node, 0, '', dateInput, 'before');
		const timestampAfter = prepareTimestamp(node, 0, '', dateInput, 'after');

		expect(timestampBefore).toBeDefined();
		expect(timestampBefore).toBe('before:1577836800');

		expect(timestampAfter).toBeDefined();
		expect(timestampAfter).toBe('after:1577836800');
	});

	it('should throw error on invalid data', () => {
		const dateInput = 'invalid';
		expect(() => prepareTimestamp(node, 0, '', dateInput, 'before')).toThrow(
			"Invalid date/time in 'Received Before' field",
		);
		expect(() => prepareTimestamp(node, 0, '', dateInput, 'after')).toThrow(
			"Invalid date/time in 'Received After' field",
		);
	});
});
