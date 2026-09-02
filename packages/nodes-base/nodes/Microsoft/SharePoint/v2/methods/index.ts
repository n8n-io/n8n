import { getFiles } from '../file';
import { getFolders } from '../folder';
import { getItems } from '../item';
import { getLists } from '../list';
import { getMappingColumns } from '../list/columns';
import { getSites } from '../site';

export const listSearch = {
	getFiles,
	getFolders,
	getSites,
	getLists,
	getItems,
};

export const resourceMapping = {
	getMappingColumns,
};
