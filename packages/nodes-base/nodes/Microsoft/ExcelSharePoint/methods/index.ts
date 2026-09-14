import {
	getTableColumns,
	getWorksheetColumnRow,
	getWorksheetColumnRowSkipColumnToMatchOn,
} from './loadOptions';
import { getSheets, getTables, searchLibraries, searchSites, searchWorkbooks } from './listSearch';

export const listSearch = {
	searchSites,
	searchLibraries,
	searchWorkbooks,
	getSheets,
	getTables,
};

export const loadOptions = {
	getTableColumns,
	getWorksheetColumnRow,
	getWorksheetColumnRowSkipColumnToMatchOn,
};
