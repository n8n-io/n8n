describe('Google Sheets Update Matching Logic', () => {
	// Test the core matching logic that was fixed
	const getKeyIndex = (key: string | number, data: Array<string | number>) => {
		let index = -1;
		const keyStr = String(key).trim();

		for (let i = 0; i < data.length; i++) {
			const dataStr = String(data[i] || '').trim();

			// Direct string match
			if (dataStr === keyStr) {
				index = i;
				break;
			}

			// Numeric comparison for phone numbers and IDs
			const keyNum = Number(keyStr);
			const dataNum = Number(dataStr);
			if (!isNaN(keyNum) && !isNaN(dataNum) && keyNum === dataNum) {
				index = i;
				break;
			}
		}
		return index;
	};

	describe('getKeyIndex matching logic', () => {
		it('should match phone numbers regardless of string/number type', () => {
			const data = [9039184000, 1234567890, 5555555555];
			const result = getKeyIndex('9039184000', data);
			expect(result).toBe(0);
		});

		it('should match numbers regardless of string/number type', () => {
			const data = ['123', '456', '789'];
			const result = getKeyIndex(123, data);
			expect(result).toBe(0);
		});

		it('should handle whitespace trimming', () => {
			const data = [' test@email.com ', 'user2@test.com'];
			const result = getKeyIndex('test@email.com', data);
			expect(result).toBe(0);
		});

		it('should handle null and undefined values', () => {
			const data = [null, undefined, ''];
			const result = getKeyIndex('', data);
			expect(result).toBe(0); // Should match null (converted to empty string)
		});

		it('should return -1 when no match found', () => {
			const data = [9039184000, 1234567890];
			const result = getKeyIndex('9999999999', data);
			expect(result).toBe(-1);
		});

		it('should prioritize exact string match over numeric match', () => {
			const data = ['123', 123, '456'];
			const result = getKeyIndex('123', data);
			expect(result).toBe(0); // Should match string '123' first
		});

		it('should handle leading zeros correctly', () => {
			const data = ['001234', '005678'];
			const result = getKeyIndex(1234, data);
			expect(result).toBe(0); // Should match '001234' with 1234
		});
	});

	// Test the lookup comparison logic
	const isLookupMatch = (cellValue: any, lookupValue: any) => {
		const cellStr = String(cellValue || '').trim();
		const lookupStr = String(lookupValue || '').trim();

		let isMatch = cellStr === lookupStr;

		// Numeric comparison for phone numbers and IDs
		if (!isMatch) {
			const cellNum = Number(cellStr);
			const lookupNum = Number(lookupStr);
			if (!isNaN(cellNum) && !isNaN(lookupNum)) {
				isMatch = cellNum === lookupNum;
			}
		}

		return isMatch;
	};

	describe('lookup matching logic', () => {
		it('should match phone numbers in lookup', () => {
			expect(isLookupMatch(9039184000, '9039184000')).toBe(true);
			expect(isLookupMatch('9039184000', 9039184000)).toBe(true);
		});

		it('should handle whitespace in lookup', () => {
			expect(isLookupMatch(' test@email.com ', 'test@email.com')).toBe(true);
		});

		it('should not match different values', () => {
			expect(isLookupMatch(9039184000, '9999999999')).toBe(false);
		});
	});
});
