import { searchBoards } from '../helpers/boardLocator';
import {
	getBoardColumns,
	getBulkImportMatchColumns,
	getClearableBoardColumns,
	getFilterableBoardColumns,
	getFilterOperators,
	getTargetBoardColumns,
} from '../helpers/columnOptions';
import { getBulkImportColumnFields, getColumnFields } from '../helpers/columnMapper';
import { getBoardList, getWorkspaces } from '../helpers/filterOptions';
import { getBoardGroups, getTargetBoardGroups, searchGroups } from '../helpers/groupLocator';
import { searchItems } from '../helpers/itemLocator';
import { searchUsers } from '../helpers/userLocator';

export const methods = {
	listSearch: {
		searchBoards,
		searchGroups,
		searchItems,
		searchUsers,
	},
	loadOptions: {
		getBoardColumns,
		getBoardGroups,
		getBoardList,
		getBulkImportMatchColumns,
		getClearableBoardColumns,
		getFilterableBoardColumns,
		getFilterOperators,
		getTargetBoardColumns,
		getTargetBoardGroups,
		getWorkspaces,
	},
	resourceMapping: {
		getBulkImportColumnFields,
		getColumnFields,
	},
};
