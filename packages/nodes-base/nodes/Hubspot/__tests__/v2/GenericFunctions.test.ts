import moment from 'moment';
import type { IDataObject } from 'n8n-workflow';

import {
	clean,
	getAssociations,
	getCallMetadata,
	getEmailMetadata,
	getMeetingMetadata,
	getTaskMetadata,
	validateJSON,
} from '../../V2/GenericFunctions';
describe('Hubspot v2 - GenericFunctions', () => {
	describe('validateJSON', () => {
		it('should parse a valid JSON string', () => {
			const jsonString = '{"key": "value"}';
			const result = validateJSON(jsonString);
			expect(result).toEqual({ key: 'value' });
		});

		it('should return an empty string for an invalid JSON string', () => {
			const jsonString = '{"key": "value"';
			const result = validateJSON(jsonString);
			expect(result).toBe('');
		});

		it('should return an empty string for undefined input', () => {
			const result = validateJSON(undefined);
			expect(result).toBe('');
		});
	});
	describe('clean', () => {
		it('should remove properties with null values', () => {
			const obj = { key1: 'value1', key2: null, key3: 'value3' };
			const result = clean(obj);
			expect(result).toEqual({ key1: 'value1', key3: 'value3' });
		});

		it('should remove properties with undefined values', () => {
			const obj = { key1: 'value1', key2: undefined, key3: 'value3' };
			const result = clean(obj);
			expect(result).toEqual({ key1: 'value1', key3: 'value3' });
		});

		it('should remove properties with empty string values', () => {
			const obj = { key1: 'value1', key2: '', key3: 'value3' };
			const result = clean(obj);
			expect(result).toEqual({ key1: 'value1', key3: 'value3' });
		});

		it('should not remove properties with non-empty values', () => {
			const obj = { key1: 'value1', key2: 'value2', key3: 'value3' };
			const result = clean(obj);
			expect(result).toEqual({ key1: 'value1', key2: 'value2', key3: 'value3' });
		});

		it('should handle an empty object', () => {
			const obj = {};
			const result = clean(obj);
			expect(result).toEqual({});
		});
	});
	describe('getEmailMetadata', () => {
		it('should return metadata with all fields', () => {
			const meta: IDataObject = {
				fromEmail: 'from@example.com',
				firstName: 'John',
				lastName: 'Doe',
				cc: ['cc1@example.com,cc2@example.com'],
				bcc: ['bcc1@example.com,bcc2@example.com'],
				subject: 'Test Subject',
				html: '<p>Test HTML</p>',
				text: 'Test Text',
			};

			const result = getEmailMetadata(meta);

			expect(result).toEqual({
				from: {
					email: 'from@example.com',
					firstName: 'John',
					lastName: 'Doe',
				},
				cc: [{ email: 'cc1@example.com' }, { email: 'cc2@example.com' }],
				bcc: [{ email: 'bcc1@example.com' }, { email: 'bcc2@example.com' }],
				subject: 'Test Subject',
				html: '<p>Test HTML</p>',
				text: 'Test Text',
			});
		});

		it('should return metadata with some fields missing', () => {
			const meta: IDataObject = {
				fromEmail: 'from@example.com',
				cc: ['cc1@example.com'],
			};

			const result = getEmailMetadata(meta);

			expect(result).toEqual({
				from: {
					email: 'from@example.com',
				},
				cc: [{ email: 'cc1@example.com' }],
				bcc: [],
			});
		});

		it('should return metadata with empty fields', () => {
			const meta: IDataObject = {};

			const result = getEmailMetadata(meta);

			expect(result).toEqual({
				from: {},
				cc: [],
				bcc: [],
			});
		});
	});
	describe('getTaskMetadata', () => {
		it('should return metadata with all fields', () => {
			const meta: IDataObject = {
				body: 'Task body',
				subject: 'Task subject',
				status: 'Task status',
				forObjectType: 'Task object type',
			};

			const result = getTaskMetadata(meta);

			expect(result).toEqual({
				body: 'Task body',
				subject: 'Task subject',
				status: 'Task status',
				forObjectType: 'Task object type',
			});
		});

		it('should return metadata with some fields missing', () => {
			const meta: IDataObject = {
				body: 'Task body',
				subject: 'Task subject',
			};

			const result = getTaskMetadata(meta);

			expect(result).toEqual({
				body: 'Task body',
				subject: 'Task subject',
			});
		});

		it('should return metadata with empty fields', () => {
			const meta: IDataObject = {};

			const result = getTaskMetadata(meta);

			expect(result).toEqual({});
		});
	});
	describe('getMeetingMetadata', () => {
		it('should return metadata with all fields', () => {
			const meta: IDataObject = {
				body: 'Meeting body',
				startTime: '2023-10-10T10:00:00Z',
				endTime: '2023-10-10T11:00:00Z',
				title: 'Meeting title',
				internalMeetingNotes: 'Meeting notes',
			};

			const result = getMeetingMetadata(meta);

			expect(result).toEqual({
				body: 'Meeting body',
				startTime: moment(meta.startTime as string).unix(),
				endTime: moment(meta.endTime as string).unix(),
				title: 'Meeting title',
				internalMeetingNotes: 'Meeting notes',
			});
		});

		it('should return metadata with some fields missing', () => {
			const meta: IDataObject = {
				body: 'Meeting body',
				startTime: '2023-10-10T10:00:00Z',
			};

			const result = getMeetingMetadata(meta);

			expect(result).toEqual({
				body: 'Meeting body',
				startTime: moment(meta.startTime as string).unix(),
			});
		});

		it('should return metadata with empty fields', () => {
			const meta: IDataObject = {};

			const result = getMeetingMetadata(meta);

			expect(result).toEqual({});
		});
	});
	describe('getCallMetadata', () => {
		it('should return metadata with all fields', () => {
			const meta: IDataObject = {
				toNumber: '1234567890',
				fromNumber: '0987654321',
				status: 'completed',
				durationMilliseconds: 60000,
				recordingUrl: 'http://example.com/recording',
				body: 'Call body',
			};

			const result = getCallMetadata(meta);

			expect(result).toEqual({
				toNumber: '1234567890',
				fromNumber: '0987654321',
				status: 'completed',
				durationMilliseconds: 60000,
				recordingUrl: 'http://example.com/recording',
				body: 'Call body',
			});
		});

		it('should return metadata with some fields missing', () => {
			const meta: IDataObject = {
				toNumber: '1234567890',
				status: 'completed',
			};

			const result = getCallMetadata(meta);

			expect(result).toEqual({
				toNumber: '1234567890',
				status: 'completed',
			});
		});

		it('should return metadata with empty fields', () => {
			const meta: IDataObject = {};

			const result = getCallMetadata(meta);

			expect(result).toEqual({});
		});
	});
	describe('getAssociations', () => {
		it('should return associations with all fields', () => {
			const associations = {
				companyIds: '1,2,3',
				dealIds: '4,5,6',
				ownerIds: '7,8,9',
				contactIds: '10,11,12',
				ticketIds: '13,14,15',
			};

			const result = getAssociations(associations);

			expect(result).toEqual({
				companyIds: ['1', '2', '3'],
				dealIds: ['4', '5', '6'],
				ownerIds: ['7', '8', '9'],
				contactIds: ['10', '11', '12'],
				ticketIds: ['13', '14', '15'],
			});
		});

		it('should return associations with empty fields', () => {
			const associations = {
				companyIds: '',
				dealIds: '',
				ownerIds: '',
				contactIds: '',
				ticketIds: '',
			};

			const result = getAssociations(associations);

			expect(result).toEqual({});
		});
	});
});
