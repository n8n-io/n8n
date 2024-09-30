import {
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type IRequestOptions,
} from 'n8n-workflow';

export async function getRepos(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	const options: IRequestOptions = {
		method: 'GET',
		qs: {},
		uri: baseURL + '/api2/repos/',
		json: true,
	};

	const repoList = await this.helpers.requestWithAuthentication.call(this, 'seafileApi', options);

	if (repoList) {
		for (const repo of repoList) {
			returnData.push({
				name: repo.name,
				value: repo.id,
			});
		}
	}
	return returnData;
}

async function getFolders(
	this: ILoadOptionsFunctions,
	repoParameterName: string,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [
		{
			name: '/',
			value: '/',
		},
	];

	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	// Get the repo value based on the provided parameter name
	const repo = this.getCurrentNodeParameter(repoParameterName) as string;
	if (!repo) {
		return returnData;
	}

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			t: 'd',
			recursive: '1',
		},
		uri: `${baseURL}/api/v2.1/repos/${repo}/dir/`,
		json: true,
	};

	const entryList = await this.helpers.requestWithAuthentication.call(this, 'seafileApi', options);

	if (entryList.dirent_list) {
		for (const entries of entryList.dirent_list) {
			const folderPath =
				entries.parent_dir === '/'
					? `${entries.parent_dir}${entries.name}/`
					: `${entries.parent_dir}/${entries.name}/`;

			returnData.push({
				name: folderPath,
				value: folderPath,
			});
		}
	}
	return returnData;
}

// Using the refactored function for different parameters
export async function getFoldersInRepo(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return getFolders.call(this, 'repo');
}

export async function getFoldersInTargetRepo(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return getFolders.call(this, 'target_repo');
}

export async function getFilesInRepo(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	const repo = this.getCurrentNodeParameter('repo') as string;
	if (!repo) {
		return returnData;
	}

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			t: 'f',
			recursive: '1',
		},
		uri: `${baseURL}/api/v2.1/repos/${repo}/dir/`,
		json: true,
	};

	const entryList = await this.helpers.requestWithAuthentication.call(this, 'seafileApi', options);
	//console.log(entryList);

	if (entryList.dirent_list) {
		for (const entries of entryList.dirent_list) {
			if (entries.parent_dir == '/') {
				returnData.push({
					name: entries.parent_dir + entries.name,
					value: entries.parent_dir + entries.name,
				});
			} else {
				returnData.push({
					name: entries.parent_dir + '/' + entries.name,
					value: entries.parent_dir + '/' + entries.name,
				});
			}
		}
	}
	return returnData;
}

export async function getDownloadLink(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	const repo = this.getCurrentNodeParameter('repo') as string;
	if (!repo) {
		return returnData;
	}

	const options: IRequestOptions = {
		method: 'GET',
		qs: {},
		uri: `${baseURL}/api/v2.1/share-links/`,
		json: true,
	};

	const shareLinkList = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	for (const links of shareLinkList) {
		if (links.repo_id == repo) {
			returnData.push({
				name: links.path,
				value: links.token,
			});
		}
	}

	return returnData;
}

export async function getUploadLink(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	const repo = this.getCurrentNodeParameter('repo') as string;
	if (!repo) {
		return returnData;
	}

	const options: IRequestOptions = {
		method: 'GET',
		qs: {},
		uri: `${baseURL}/api/v2.1/upload-links/`,
		json: true,
	};

	const shareLinkList = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	for (const links of shareLinkList) {
		if (links.repo_id == repo) {
			returnData.push({
				name: links.path,
				value: links.token,
			});
		}
	}

	return returnData;
}

export async function getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];

	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	const repo = this.getCurrentNodeParameter('repo') as string;
	if (!repo) {
		return returnData;
	}

	const options: IRequestOptions = {
		method: 'GET',
		qs: {},
		uri: `${baseURL}/api/v2.1/repos/${repo}/repo-tags/`,
		json: true,
	};

	const repoTags = await this.helpers.requestWithAuthentication.call(this, 'seafileApi', options);

	for (const tag of repoTags.repo_tags) {
		returnData.push({
			name: tag.tag_name,
			value: tag.repo_tag_id,
		});
	}

	return returnData;
}
