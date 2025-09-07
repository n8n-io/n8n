import { simplify, merge } from '../../../v2/helpers/utils';

describe('Google Analytics V2 utils', () => {
	describe('simplify', () => {
		it('should simplify GA4 report data', () => {
			const responseData = [
				{
					columnHeader: {
						dimensions: ['date', 'deviceCategory'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'activeUsers' }, { name: 'sessions' }],
						},
					},
					data: {
						rows: [
							{
								dimensions: ['20230101', 'desktop'],
								metrics: [{ values: ['150', '200'] }],
							},
							{
								dimensions: ['20230102', 'mobile'],
								metrics: [{ values: ['100', '120'] }],
							},
						],
					},
				},
			];

			const result = simplify(responseData);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				date: '20230101',
				deviceCategory: 'desktop',
				activeUsers: '150',
				sessions: '200',
			});
			expect(result[1]).toEqual({
				date: '20230102',
				deviceCategory: 'mobile',
				activeUsers: '100',
				sessions: '120',
			});
		});

		it('should handle data with no dimensions', () => {
			const responseData = [
				{
					columnHeader: {
						metricHeader: {
							metricHeaderEntries: [{ name: 'totalUsers' }],
						},
					},
					data: {
						rows: [
							{
								metrics: [{ values: ['500'] }],
							},
						],
					},
				},
			];

			const result = simplify(responseData);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				totalUsers: '500',
			});
		});

		it('should handle undefined rows', () => {
			const responseData = [
				{
					columnHeader: {
						dimensions: ['date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'activeUsers' }],
						},
					},
					data: {},
				},
			];

			const result = simplify(responseData);

			expect(result).toEqual([]);
		});
	});

	describe('merge', () => {
		it('should merge multiple reports', () => {
			const responseData = [
				{
					columnHeader: {
						dimensions: ['date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'activeUsers' }],
						},
					},
					data: {
						rows: [
							{
								dimensions: ['20230101'],
								metrics: [{ values: ['100'] }],
							},
						],
					},
				},
				{
					columnHeader: {
						dimensions: ['date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'activeUsers' }],
						},
					},
					data: {
						rows: [
							{
								dimensions: ['20230102'],
								metrics: [{ values: ['150'] }],
							},
						],
					},
				},
			] as any;

			const result = merge(responseData);

			expect(result).toHaveLength(1);
			expect(result[0].data.rows).toHaveLength(2);
			expect(result[0].columnHeader).toEqual(responseData[0].columnHeader);
		});
	});
});
