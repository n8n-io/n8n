import { getFolders } from '../folder';
import { getLists } from '../list';
import { getMappingColumns } from '../list/columns';
import { getSites } from '../site';

export const listSearch = {
	getFolders,
	getSites,
	getLists,
};

export const resourceMapping = {
	getMappingColumns,
};
