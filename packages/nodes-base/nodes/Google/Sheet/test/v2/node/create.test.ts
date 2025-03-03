import type { IExecuteFunctions } from 'n8n-workflow';

import { execute } from '../../../v2/actions/sheet/create.operation';
import type { GoogleSheet } from '../../../v2/helpers/GoogleSheet';
import { getExistingSheetNames, hexToRgb } from '../../../v2/helpers/GoogleSheets.utils';
import { apiRequest } from '../../../v2/transport';

jest.mock('../../../v2/helpers/GoogleSheets.utils', () => ({
	getExistingSheetNames: jest.fn(),
	hexToRgb: jest.fn(),
}));

jest.mock('../../../v2/transport', () => ({
	apiRequest: jest.fn(),
}));

describe('Google Sheet - Create', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});
	const mockExecuteFunctions = {
		getInputData: jest.fn(),
		getNodeParameter: jest.fn(),
		helpers: {
			constructExecutionMetaData: jest.fn(),
		},
	} as unknown as Partial<IExecuteFunctions>;

	const sheet = {} as Partial<GoogleSheet>;
	const sheetName = 'test-sheet';

	test('should create a new sheet with given title and options', async () => {
		const items = [{ json: {} }];
		const existingSheetNames = ['existing-sheet'];
		const sheetTitle = 'new-sheet';
		const options = { tabColor: '0aa55c' };
		const rgbColor = { red: 10, green: 165, blue: 92 };
		const responseData = {
			replies: [{ addSheet: { properties: { title: sheetTitle } } }],
		};

		(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(items);
		(mockExecuteFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			if (paramName === 'title') return sheetTitle;
			if (paramName === 'options') return options;
		});
		(getExistingSheetNames as jest.Mock).mockResolvedValue(existingSheetNames);
		(hexToRgb as jest.Mock).mockReturnValue(rgbColor);
		(apiRequest as jest.Mock).mockResolvedValue(responseData);
		(mockExecuteFunctions as IExecuteFunctions).helpers.constructExecutionMetaData = jest
			.fn()
			.mockReturnValue([{ json: responseData }]);

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			sheet as GoogleSheet,
			sheetName,
		);

		expect(result).toEqual([{ json: responseData }]);
		expect(getExistingSheetNames).toHaveBeenCalledWith(sheet);
		expect(apiRequest).toHaveBeenCalledWith('POST', `/v4/spreadsheets/${sheetName}:batchUpdate`, {
			requests: [
				{
					addSheet: {
						properties: {
							title: sheetTitle,
							tabColor: { red: 10 / 255, green: 165 / 255, blue: 92 / 255 },
						},
					},
				},
			],
		});
	});

	test('should skip creating a sheet if the title already exists', async () => {
		const items = [{ json: {} }];
		const existingSheetNames = ['existing-sheet'];
		const sheetTitle = 'existing-sheet';

		(mockExecuteFunctions as IExecuteFunctions).getInputData = jest.fn().mockReturnValue(items);
		(mockExecuteFunctions as IExecuteFunctions).getNodeParameter = jest
			.fn()
			.mockImplementation((paramName: string) => {
				if (paramName === 'title') return sheetTitle;
				if (paramName === 'options') return {};
			});
		(getExistingSheetNames as jest.Mock).mockResolvedValue(existingSheetNames);

		const result = await execute.call(
			mockExecuteFunctions as IExecuteFunctions,
			sheet as GoogleSheet,
			sheetName,
		);

		expect(result).toEqual([]);
		expect(getExistingSheetNames).toHaveBeenCalledWith(sheet);
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
