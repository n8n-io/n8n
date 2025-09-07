import { simplifyGA4 } from '../../../v2/helpers/utils';

describe('Google Analytics V2 Additional Utils', () => {
	describe('simplifyGA4', () => {
		it('should simplify GA4 response with dimensions and metrics', () => {
			const response = {
				dimensionHeaders: [{ name: 'date' }, { name: 'deviceCategory' }],
				metricHeaders: [{ name: 'activeUsers' }, { name: 'sessions' }],
				rows: [
					{
						dimensionValues: [{ value: '20230101' }, { value: 'desktop' }],
						metricValues: [{ value: '100' }, { value: '120' }],
					},
					{
						dimensionValues: [{ value: '20230102' }, { value: 'mobile' }],
						metricValues: [{ value: '80' }, { value: '95' }],
					},
				],
			};

			const result = simplifyGA4(response);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				date: '20230101',
				deviceCategory: 'desktop',
				activeUsers: '100',
				sessions: '120',
			});
			expect(result[1]).toEqual({
				date: '20230102',
				deviceCategory: 'mobile',
				activeUsers: '80',
				sessions: '95',
			});
		});

		it('should handle GA4 response without dimensions', () => {
			const response = {
				dimensionHeaders: [],
				metricHeaders: [{ name: 'totalUsers' }],
				rows: [
					{
						dimensionValues: [],
						metricValues: [{ value: '1000' }],
					},
				],
			};

			const result = simplifyGA4(response);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				totalUsers: '1000',
			});
		});

		it('should handle GA4 response without rows', () => {
			const response = {
				dimensionHeaders: [{ name: 'date' }],
				metricHeaders: [{ name: 'activeUsers' }],
			};

			const result = simplifyGA4(response);

			expect(result).toEqual([]);
		});

		it('should handle GA4 response with empty rows array', () => {
			const response = {
				dimensionHeaders: [{ name: 'date' }],
				metricHeaders: [{ name: 'activeUsers' }],
				rows: [],
			};

			const result = simplifyGA4(response);

			expect(result).toEqual([]);
		});

		it('should handle GA4 response with null row', () => {
			const response = {
				dimensionHeaders: [{ name: 'date' }],
				metricHeaders: [{ name: 'activeUsers' }],
				rows: [
					{
						dimensionValues: [{ value: '20230101' }],
						metricValues: [{ value: '100' }],
					},
					null,
					{
						dimensionValues: [{ value: '20230102' }],
						metricValues: [{ value: '150' }],
					},
				],
			};

			const result = simplifyGA4(response);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				date: '20230101',
				activeUsers: '100',
			});
			expect(result[1]).toEqual({
				date: '20230102',
				activeUsers: '150',
			});
		});

		it('should handle GA4 response with missing headers', () => {
			const response = {
				rows: [
					{
						dimensionValues: [{ value: '20230101' }],
						metricValues: [{ value: '100' }],
					},
				],
			};

			const result = simplifyGA4(response);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({});
		});
	});
});
