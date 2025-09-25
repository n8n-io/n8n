import { merge, simplify } from '../../v1/GenericFunctions';

describe('Google Analytics V1 GenericFunctions', () => {
	describe('simplify', () => {
		it('should simplify Google Analytics report data with dimensions and metrics', () => {
			const reportData = [
				{
					data: {
						rows: [
							{
								dimensions: ['2023-01-01', 'Desktop'],
								metrics: [{ values: ['100', '50'] }],
							},
							{
								dimensions: ['2023-01-02', 'Mobile'],
								metrics: [{ values: ['150', '75'] }],
							},
						],
					},
					columnHeader: {
						dimensions: ['ga:date', 'ga:deviceCategory'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'ga:sessions' }, { name: 'ga:users' }],
						},
					},
				},
			];

			const result = simplify(reportData);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				'ga:date': '2023-01-01',
				'ga:deviceCategory': 'Desktop',
				'ga:sessions': '100',
				'ga:users': '50',
			});
		});

		it('should handle empty report data', () => {
			const reportData = [
				{
					data: {
						rows: [],
					},
					columnHeader: {
						dimensions: ['ga:date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'ga:sessions' }],
						},
					},
				},
			];

			const result = simplify(reportData);

			expect(result).toEqual([]);
		});

		it('should handle report data without dimensions', () => {
			const reportData = [
				{
					data: {
						rows: [
							{
								metrics: [{ values: ['500'] }],
							},
						],
					},
					columnHeader: {
						dimensions: null,
						metricHeader: {
							metricHeaderEntries: [{ name: 'ga:sessions' }],
						},
					},
				},
			];

			const result = simplify(reportData);

			expect(result).toEqual([{ 'ga:sessions': '500' }]);
		});
	});

	describe('merge', () => {
		it('should merge multiple Google Analytics reports', () => {
			const reports = [
				{
					columnHeader: {
						dimensions: ['ga:date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'ga:sessions' }],
						},
					},
					data: {
						rows: [
							{
								dimensions: ['2023-01-01'],
								metrics: [{ values: ['100'] }],
							},
						],
					},
				},
				{
					columnHeader: {
						dimensions: ['ga:date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'ga:sessions' }],
						},
					},
					data: {
						rows: [
							{
								dimensions: ['2023-01-02'],
								metrics: [{ values: ['150'] }],
							},
						],
					},
				},
			] as any;

			const result = merge(reports);

			expect(result).toHaveLength(1);
			expect(result[0].data.rows).toHaveLength(2);
			const rows = result[0].data.rows as any[];
			expect(rows[0]).toEqual({
				dimensions: ['2023-01-01'],
				metrics: [{ values: ['100'] }],
			});
			expect(rows[1]).toEqual({
				dimensions: ['2023-01-02'],
				metrics: [{ values: ['150'] }],
			});
			expect(result[0].columnHeader).toEqual(reports[0].columnHeader);
		});

		it('should handle single report', () => {
			const reports = [
				{
					columnHeader: {
						dimensions: ['ga:date'],
						metricHeader: {
							metricHeaderEntries: [{ name: 'ga:sessions' }],
						},
					},
					data: {
						rows: [
							{
								dimensions: ['2023-01-01'],
								metrics: [{ values: ['100'] }],
							},
						],
					},
				},
			] as any;

			const result = merge(reports);

			expect(result).toHaveLength(1);
			expect(result[0].data.rows).toHaveLength(1);
			expect(result[0].columnHeader).toEqual(reports[0].columnHeader);
		});
	});
});
