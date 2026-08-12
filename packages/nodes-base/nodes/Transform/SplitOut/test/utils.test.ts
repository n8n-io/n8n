import { FieldsTracker } from '../utils';

describe('FieldsTracker', () => {
	let fieldsTracker: FieldsTracker;

	beforeEach(() => {
		fieldsTracker = new FieldsTracker();
	});

	describe('add', () => {
		it('should add field with false value', () => {
			fieldsTracker.add('testField');

			expect(fieldsTracker.fields.testField).toBe(false);
		});

		it('should not overwrite existing field', () => {
			fieldsTracker.add('testField');
			fieldsTracker.fields.testField = true;
			fieldsTracker.add('testField');

			expect(fieldsTracker.fields.testField).toBe(true);
		});
	});

	describe('update', () => {
		it('should update field from false to true', () => {
			fieldsTracker.add('testField');
			fieldsTracker.update('testField', true);

			expect(fieldsTracker.fields.testField).toBe(true);
		});

		it('should not update field from true to false', () => {
			fieldsTracker.add('testField');
			fieldsTracker.fields.testField = true;
			fieldsTracker.update('testField', false);

			expect(fieldsTracker.fields.testField).toBe(true);
		});
	});

	describe('getHints', () => {
		it('should return empty array when no fields tracked', () => {
			expect(fieldsTracker.getHints()).toEqual([]);
		});

		it('should return hint for missing field', () => {
			fieldsTracker.add('missingField');

			const hints = fieldsTracker.getHints();

			expect(hints).toEqual([
				{
					message: "The field 'missingField' wasn't found in any input item",
					location: 'outputPane',
				},
			]);
		});

		it('should not return hint for found field', () => {
			fieldsTracker.add('foundField');
			fieldsTracker.update('foundField', true);

			expect(fieldsTracker.getHints()).toEqual([]);
		});
	});
});
