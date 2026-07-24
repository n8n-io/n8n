export type NotionV3Type =
	| { resource: 'block'; operation: 'append' | 'getAll' | 'getMarkdown' }
	| { resource: 'dataSource'; operation: 'get' | 'search' }
	| { resource: 'database'; operation: 'get' }
	| { resource: 'databasePage'; operation: 'create' | 'get' | 'getAll' | 'update' }
	| {
			resource: 'page';
			operation: 'archive' | 'create' | 'getMarkdown' | 'search' | 'updateMarkdown';
	  }
	| { resource: 'user'; operation: 'get' | 'getAll' };
