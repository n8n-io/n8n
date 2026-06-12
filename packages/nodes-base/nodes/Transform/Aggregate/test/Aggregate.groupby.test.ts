import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Aggregate } from '../Aggregate.node';

describe('Aggregate Node - Group By Feature', () => {
	let aggregate: Aggregate;
	let mockExecuteFunctions: Partial<IExecuteFunctions>;
	let mockNode: INode;

	beforeEach(() => {
		aggregate = new Aggregate();
		mockNode = {
			id: 'test-node-id',
			name: 'Aggregate Test',
			typeVersion: 1,
			type: 'n8n-nodes-base.aggregate',
			position: [0, 0],
			parameters: {},
		};

		mockExecuteFunctions = {
			getNode: jest.fn().mockReturnValue(mockNode),
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			addExecutionHints: jest.fn(),
		};
	});

	describe('Field Name Conflict Validation', () => {
		it('should throw error when aggregated field conflicts with group-by field (aggregateIndividualFields)', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test1@yahoo.com' },
					pairedItem: { item: 0 },
				},
				{
					json: { domain: 'gmail.com', email: 'test2@gmail.com' },
					pairedItem: { item: 1 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'fieldsToAggregate.fieldToAggregate')
						return [
							{
								fieldToAggregate: 'email',
								renameField: true,
								outputFieldName: 'domain', // Conflicts with group-by field
							},
						];
					if (paramName === 'options.disableDotNotation') return false;
					if (paramName === 'options.mergeLists') return false;
					if (paramName === 'options.keepMissing') return false;
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow("The output field 'domain' conflicts with a Group By field");
		});

		it('should throw error when destination field conflicts with group-by field (aggregateAllItemData)', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test1@yahoo.com' },
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateAllItemData';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'destinationFieldName') return 'domain'; // Conflicts
					if (paramName === 'fieldsToExclude') return '';
					if (paramName === 'fieldsToInclude') return '';
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow("The destination field 'domain' conflicts with a Group By field");
		});

		it('should throw error when aggregated field is parent of nested group-by field (aggregateIndividualFields)', async () => {
			const inputData = [
				{
					json: { user: { name: 'Alice' }, email: 'alice@example.com' },
					pairedItem: { item: 0 },
				},
				{
					json: { user: { name: 'Bob' }, email: 'bob@example.com' },
					pairedItem: { item: 1 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'user.name';
					if (paramName === 'fieldsToAggregate.fieldToAggregate')
						return [
							{
								fieldToAggregate: 'email',
								renameField: true,
								outputFieldName: 'user', // Parent of group-by field 'user.name'
							},
						];
					if (paramName === 'options.disableDotNotation') return false;
					if (paramName === 'options.mergeLists') return false;
					if (paramName === 'options.keepMissing') return false;
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow("The output field 'user' conflicts with a Group By field 'user.name'");
		});

		it('should throw error when aggregated field is child of group-by field (aggregateIndividualFields)', async () => {
			const inputData = [
				{
					json: {
						domain: 'example.com',
						user: { name: 'Alice', role: 'admin' },
						email: 'alice@example.com',
					},
					pairedItem: { item: 0 },
				},
				{
					json: {
						domain: 'example.com',
						user: { name: 'Bob', role: 'user' },
						email: 'bob@example.com',
					},
					pairedItem: { item: 1 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'fieldsToAggregate.fieldToAggregate')
						return [
							{
								fieldToAggregate: 'email',
								renameField: true,
								outputFieldName: 'domain.subdomain', // Child of group-by field 'domain'
							},
						];
					if (paramName === 'options.disableDotNotation') return false;
					if (paramName === 'options.mergeLists') return false;
					if (paramName === 'options.keepMissing') return false;
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(
				"The output field 'domain.subdomain' conflicts with a Group By field 'domain'",
			);
		});

		it('should throw error when destination field is parent of nested group-by field (aggregateAllItemData)', async () => {
			const inputData = [
				{
					json: { user: { name: 'Alice' }, email: 'alice@example.com' },
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateAllItemData';
					if (paramName === 'options.groupByFields') return 'user.name';
					if (paramName === 'destinationFieldName') return 'user'; // Parent of 'user.name'
					if (paramName === 'fieldsToExclude') return '';
					if (paramName === 'fieldsToInclude') return '';
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow("The destination field 'user' conflicts with a Group By field 'user.name'");
		});

		it('should throw error when destination field is child of group-by field (aggregateAllItemData)', async () => {
			const inputData = [
				{
					json: {
						domain: 'example.com',
						user: { name: 'Alice', role: 'admin' },
						email: 'alice@example.com',
					},
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateAllItemData';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'destinationFieldName') return 'domain.data'; // Child of 'domain'
					if (paramName === 'fieldsToExclude') return '';
					if (paramName === 'fieldsToInclude') return '';
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(
				"The destination field 'domain.data' conflicts with a Group By field 'domain'",
			);
		});

		it('should NOT throw error when fields share common prefix but are not nested (aggregateIndividualFields)', async () => {
			const inputData = [
				{
					json: { user: 'Alice', userName: 'alice123', email: 'alice@example.com' },
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'user';
					if (paramName === 'fieldsToAggregate.fieldToAggregate')
						return [
							{
								fieldToAggregate: 'email',
								renameField: true,
								outputFieldName: 'userName', // Shares prefix but not nested
							},
						];
					if (paramName === 'options.disableDotNotation') return false;
					if (paramName === 'options.mergeLists') return false;
					if (paramName === 'options.keepMissing') return false;
					if (paramName === 'options.includeBinaries') return false;
					return '';
				},
			);

			// Should not throw - 'user' and 'userName' are different fields
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).resolves.not.toThrow();
		});
	});

	describe('Duplicate Output Field Validation', () => {
		it('should throw error when output field names are duplicated in grouped mode', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test@yahoo.com', name: 'Test' },
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'fieldsToAggregate.fieldToAggregate')
						return [
							{
								fieldToAggregate: 'email',
								renameField: false,
								outputFieldName: '',
							},
							{
								fieldToAggregate: 'name',
								renameField: true,
								outputFieldName: 'email', // Duplicate!
							},
						];
					if (paramName === 'options.disableDotNotation') return false;
					if (paramName === 'options.mergeLists') return false;
					if (paramName === 'options.keepMissing') return false;
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow("The 'email' output field is used more than once");
		});
	});

	describe('Empty Fields Validation', () => {
		it('should throw error when no fields are specified in grouped mode', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test@yahoo.com' },
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'fieldsToAggregate.fieldToAggregate') return []; // Empty!
					if (paramName === 'options.disableDotNotation') return false;
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow('No fields specified');
		});
	});

	describe('Non-scalar Group By Field Validation', () => {
		it('should throw error when trying to group by object field', async () => {
			const inputData = [
				{
					json: { user: { name: 'John' }, email: 'john@example.com' },
					pairedItem: { item: 0 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateAllItemData';
					if (paramName === 'options.groupByFields') return 'user'; // Object field
					if (paramName === 'destinationFieldName') return 'data';
					if (paramName === 'fieldsToExclude') return '';
					if (paramName === 'fieldsToInclude') return '';
					return '';
				},
			);

			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow(NodeOperationError);
			await expect(
				aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions),
			).rejects.toThrow('non-scalar value which cannot be used for grouping');
		});
	});

	describe('Successful Grouping', () => {
		it('should successfully group items by domain (aggregateAllItemData)', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test1@yahoo.com' },
					pairedItem: { item: 0 },
				},
				{
					json: { domain: 'gmail.com', email: 'test2@gmail.com' },
					pairedItem: { item: 1 },
				},
				{
					json: { domain: 'yahoo.com', email: 'test3@yahoo.com' },
					pairedItem: { item: 2 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateAllItemData';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'destinationFieldName') return 'data';
					if (paramName === 'fieldsToExclude') return '';
					if (paramName === 'fieldsToInclude') return '';
					if (paramName === 'options.includeBinaries') return false;
					return '';
				},
			);

			const result = await aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(2); // Two groups: yahoo.com and gmail.com

			// Check yahoo.com group
			const yahooGroup = result[0].find((item) => item.json.domain === 'yahoo.com');
			expect(yahooGroup).toBeDefined();
			expect(yahooGroup?.json.data).toHaveLength(2);
			expect(yahooGroup?.json.data).toEqual([
				{ domain: 'yahoo.com', email: 'test1@yahoo.com' },
				{ domain: 'yahoo.com', email: 'test3@yahoo.com' },
			]);

			// Check gmail.com group
			const gmailGroup = result[0].find((item) => item.json.domain === 'gmail.com');
			expect(gmailGroup).toBeDefined();
			expect(gmailGroup?.json.data).toHaveLength(1);
			expect(gmailGroup?.json.data).toEqual([{ domain: 'gmail.com', email: 'test2@gmail.com' }]);
		});

		it('should successfully group items by domain (aggregateIndividualFields)', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test1@yahoo.com', confirmed: true },
					pairedItem: { item: 0 },
				},
				{
					json: { domain: 'gmail.com', email: 'test2@gmail.com', confirmed: false },
					pairedItem: { item: 1 },
				},
				{
					json: { domain: 'yahoo.com', email: 'test3@yahoo.com', confirmed: false },
					pairedItem: { item: 2 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateIndividualFields';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'fieldsToAggregate.fieldToAggregate')
						return [
							{
								fieldToAggregate: 'email',
								renameField: false,
								outputFieldName: '',
							},
							{
								fieldToAggregate: 'confirmed',
								renameField: false,
								outputFieldName: '',
							},
						];
					if (paramName === 'options.disableDotNotation') return false;
					if (paramName === 'options.mergeLists') return false;
					if (paramName === 'options.keepMissing') return false;
					if (paramName === 'options.includeBinaries') return false;
					return '';
				},
			);

			const result = await aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(2); // Two groups

			// Check yahoo.com group
			const yahooGroup = result[0].find((item) => item.json.domain === 'yahoo.com');
			expect(yahooGroup).toBeDefined();
			expect(yahooGroup?.json.email).toEqual(['test1@yahoo.com', 'test3@yahoo.com']);
			expect(yahooGroup?.json.confirmed).toEqual([true, false]);

			// Check gmail.com group
			const gmailGroup = result[0].find((item) => item.json.domain === 'gmail.com');
			expect(gmailGroup).toBeDefined();
			expect(gmailGroup?.json.email).toEqual(['test2@gmail.com']);
			expect(gmailGroup?.json.confirmed).toEqual([false]);
		});

		it('should include binaries when includeBinaries option is enabled', async () => {
			const inputData = [
				{
					json: { domain: 'yahoo.com', email: 'test1@yahoo.com' },
					binary: {
						file1: {
							data: 'base64data1',
							mimeType: 'text/plain',
							fileExtension: 'txt',
							fileSize: '100',
							fileType: 'text',
						} as any,
					},
					pairedItem: { item: 0 },
				},
				{
					json: { domain: 'gmail.com', email: 'test2@gmail.com' },
					binary: {
						file2: {
							data: 'base64data2',
							mimeType: 'image/png',
							fileExtension: 'png',
							fileSize: '200',
							fileType: 'image',
						} as any,
					},
					pairedItem: { item: 1 },
				},
				{
					json: { domain: 'yahoo.com', email: 'test3@yahoo.com' },
					binary: {
						file3: {
							data: 'base64data3',
							mimeType: 'text/plain',
							fileExtension: 'txt',
							fileSize: '150',
							fileType: 'text',
						} as any,
					},
					pairedItem: { item: 2 },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation(
				(paramName: string) => {
					if (paramName === 'aggregate') return 'aggregateAllItemData';
					if (paramName === 'options.groupByFields') return 'domain';
					if (paramName === 'destinationFieldName') return 'data';
					if (paramName === 'fieldsToExclude') return '';
					if (paramName === 'fieldsToInclude') return '';
					if (paramName === 'options.includeBinaries') return true;
					if (paramName === 'options.keepOnlyUnique') return false;
					return '';
				},
			);

			const result = await aggregate.execute.call(mockExecuteFunctions as IExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(2); // Two groups

			// Check yahoo.com group has binaries from both items
			const yahooGroup = result[0].find((item) => item.json.domain === 'yahoo.com');
			expect(yahooGroup).toBeDefined();
			expect(yahooGroup?.binary).toBeDefined();
			expect(yahooGroup?.binary?.file1).toBeDefined();
			expect(yahooGroup?.binary?.file3).toBeDefined();
			expect(yahooGroup?.binary?.file1.mimeType).toBe('text/plain');
			expect(yahooGroup?.binary?.file3.mimeType).toBe('text/plain');

			// Check gmail.com group has binary
			const gmailGroup = result[0].find((item) => item.json.domain === 'gmail.com');
			expect(gmailGroup).toBeDefined();
			expect(gmailGroup?.binary).toBeDefined();
			expect(gmailGroup?.binary?.file2).toBeDefined();
			expect(gmailGroup?.binary?.file2.mimeType).toBe('image/png');
		});
	});
});
