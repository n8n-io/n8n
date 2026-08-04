import { searchBoards } from '../helpers/boardLocator';
import {
	getAggregateGroupByColumns,
	getAggregateMinMaxColumns,
	getAggregateNumericColumns,
	getBoardColumns,
	getBoardLabelColumns,
	getBulkImportMatchColumns,
	getClearableBoardColumns,
	getColumnLabels,
	getFilterableBoardColumns,
	getFilterOperators,
	getTargetBoardColumns,
} from '../helpers/columnOptions';
import { getBulkImportColumnFields, getColumnFields } from '../helpers/columnMapper';
import {
	getBoardList,
	getCreateBoardWorkspaceFolders,
	getWorkspaceFolders,
	getWorkspaces,
} from '../helpers/filterOptions';
import { getBoardGroups, getTargetBoardGroups, searchGroups } from '../helpers/groupLocator';
import { searchItems } from '../helpers/itemLocator';
import { getTeamsList, searchUsers, searchUsersAndTeams } from '../helpers/userLocator';
import { searchWorkspaces } from '../helpers/workspaceLocator';

export const methods = {
	listSearch: {
		searchBoards,
		searchGroups,
		searchItems,
		searchUsers,
		searchUsersAndTeams,
		searchWorkspaces,
	},
	loadOptions: {
		getAggregateGroupByColumns,
		getAggregateMinMaxColumns,
		getAggregateNumericColumns,
		getBoardColumns,
		getBoardGroups,
		getBoardLabelColumns,
		getBoardList,
		getBulkImportMatchColumns,
		getClearableBoardColumns,
		getColumnLabels,
		getCreateBoardWorkspaceFolders,
		getFilterableBoardColumns,
		getFilterOperators,
		getTargetBoardColumns,
		getTargetBoardGroups,
		getTeamsList,
		getWorkspaceFolders,
		getWorkspaces,
	},
	resourceMapping: {
		getBulkImportColumnFields,
		getColumnFields,
	},
};
