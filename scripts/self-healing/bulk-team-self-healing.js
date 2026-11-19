// Run in the signed-in internal editor console.
// Preview: await bulkTeamSelfHealing('reviewer@n8n.io')
// Apply:   await bulkTeamSelfHealing('reviewer@n8n.io', { apply: true })
// Only during a coordinated window with no other configuration editors:
// await bulkTeamSelfHealing('reviewer@n8n.io', { exclusiveEdits: true })
// await bulkTeamSelfHealing('reviewer@n8n.io', { apply: true, exclusiveEdits: true })
async function bulkTeamSelfHealing(reviewerEmail, { apply = false, exclusiveEdits = false } = {}) {
	if (location.origin !== 'https://internal.users.n8n.cloud') {
		throw new Error('Open the internal n8n editor first.');
	}
	if (typeof apply !== 'boolean' || typeof exclusiveEdits !== 'boolean') {
		throw new TypeError('apply and exclusiveEdits must be booleans.');
	}
	const email = reviewerEmail.trim().toLowerCase();
	if (!email.includes('@')) throw new Error('Provide the reviewer’s n8n account email.');
	const browserId = localStorage.getItem('n8n-browserId');
	if (!browserId) throw new Error('Sign in to the editor and reload the page.');

	async function request(path, method = 'GET', body) {
		const response = await fetch('/rest/' + path, {
			method,
			credentials: 'same-origin',
			redirect: 'error',
			headers: {
				'browser-id': browserId,
				...(body && { 'Content-Type': 'application/json' }),
			},
			body: body && JSON.stringify(body),
		});
		if (!response.ok) {
			const details = await response.json().catch(() => null);
			const message = details?.message || response.statusText;
			const error = new Error('HTTP ' + response.status + (message ? ' — ' + message : ''));
			error.status = response.status;
			throw error;
		}
		const reply = await response.json();
		if (!Object.hasOwn(reply, 'data')) throw new Error('Unexpected response from ' + path);
		return reply.data;
	}

	const recoverable = (error) => [400, 403, 404, 409].includes(error.status);
	const mode = apply ? 'Apply' : 'Preview';
	const entries = [];
	const summary = {
		mode,
		operator: null,
		version: null,
		reviewer: email,
		totalTeams: null,
		visibleTeams: null,
		completed: 0,
		skipped: 0,
		incomplete: 0,
		unprocessed: null,
		stopped: null,
	};
	let activeProject;
	let activeItem;
	function record(status, action) {
		entries.push({
			mode,
			project: activeProject?.name,
			projectId: activeProject?.id,
			configuration: activeItem,
			status,
			action,
		});
	}

	async function write(action, path, method, body) {
		if (!apply) {
			record('Planned', action);
			return;
		}
		let saved;
		try {
			saved = await request(path, method, body);
		} catch (error) {
			if (!error.status || error.status >= 500) {
				record('Unknown outcome', action + ' — recheck before retrying: ' + error.message);
			}
			throw error;
		}
		if (method === 'POST') {
			activeItem = saved.id;
			if (saved.includeSubWorkflows !== true) {
				record(
					'Created with unexpected settings',
					'The server did not confirm sub-workflow repair.',
				);
				throw new Error('Check the created configuration before continuing.');
			}
		}
		record('Applied', action);
	}

	async function configure(projectPath) {
		const path = projectPath + '/self-healing-configurations';
		const { scopes } = await request(projectPath);
		if (!scopes.includes('project:update')) {
			record('Skipped', 'Operator lacks project:update.');
			return;
		}
		const missing = ['workflow:read', 'workflow:update', 'execution:read'].filter(
			(scope) => !scopes.includes(scope),
		);
		const configs = await request(path);
		const options = await request(path + '/options');
		const reviewer = options.reviewers.find((user) => user.email?.toLowerCase() === email);
		if (!reviewer) {
			record('Skipped', 'Target is ineligible for reviewer selection in this project.');
			return;
		}
		const eligibleReviewers = new Set(options.reviewers.map(({ id }) => id));
		const availableWorkflows = new Set(options.workflows.map(({ id }) => id));

		async function enable(action, url, method, body) {
			if (missing.length) {
				record('Blocked', action + ' requires ' + missing.join(', '));
				return;
			}
			await write(
				apply ? action : action + ' (subject to server access checks)',
				url,
				method,
				body,
			);
		}

		if (!configs.some((config) => config.scope === 'all')) {
			activeItem = 'new';
			try {
				await enable('Create all-workflows configuration with sub-workflow repair', path, 'POST', {
					scope: 'all',
					enabled: true,
					reviewerIds: [reviewer.id],
					workflowIds: [],
					includeAllProjectMembers: false,
					includeSubWorkflows: true,
				});
			} catch (error) {
				if (!recoverable(error)) throw error;
				record('Failed', error.message);
			}
		}

		for (const listed of configs) {
			activeItem = listed.id;
			const itemPath = path + '/' + encodeURIComponent(listed.id);
			try {
				const config = apply ? await request(itemPath) : listed;
				if (config.scope === 'selected' && !config.enabled) {
					record('Paused', 'Keep selected workflows paused: ' + config.workflowIds.join(', '));
				}

				const covered = config.includeAllProjectMembers || config.reviewerIds.includes(reviewer.id);
				if (!covered) {
					const staleUsers = config.reviewerIds.filter((id) => !eligibleReviewers.has(id));
					const staleFlows = config.workflowIds.filter((id) => !availableWorkflows.has(id));
					if (staleUsers.length || staleFlows.length) {
						record(
							'Blocked',
							'Saved selections need review. Unavailable reviewers: ' +
								(staleUsers.join(', ') || 'none') +
								'. Unavailable workflows: ' +
								(staleFlows.join(', ') || 'none'),
						);
						continue;
					}
					// This endpoint replaces selections. Its API provides no conditional write.
					if (!exclusiveEdits) {
						record(
							'Blocked',
							'Adding the reviewer requires a coordinated exclusive editing window.',
						);
						continue;
					}
					await write('Add reviewer (requires exclusive editing)', itemPath, 'PATCH', {
						scope: config.scope,
						workflowIds: config.workflowIds,
						reviewerIds: [...config.reviewerIds, reviewer.id],
						includeAllProjectMembers: config.includeAllProjectMembers,
						includeSubWorkflows: config.includeSubWorkflows,
					});
				}
				if (config.scope === 'all' && !config.enabled) {
					await enable('Enable all-workflows configuration', itemPath + '/enabled', 'PATCH', {
						enabled: true,
					});
				} else if (covered) {
					record('Covered', 'Target already included as a reviewer.');
				}
			} catch (error) {
				if (!recoverable(error)) throw error;
				record('Failed', error.message);
			}
		}
	}

	try {
		const operator = await request('login');
		summary.operator = operator.email || operator.id;
		const settings = await request('settings');
		summary.version = settings.versionCli;
		// Older servers silently discard includeSubWorkflows when creating configurations.
		const version = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(settings.versionCli ?? '');
		const supportsSubWorkflows =
			(version?.[1] === '2' && Number(version[2]) >= 49) ||
			(version?.[1] === '3' && Number(version[2]) >= 3);
		if (!supportsSubWorkflows) {
			throw new Error(
				'Sub-workflow repair requires n8n 2.49.x or later on 2.x, or 3.3.x or later on 3.x. ' +
					'Reported version: ' +
					(settings.versionCli ?? 'unknown'),
			);
		}
		const counts = await request('projects/count');
		const visible = await request('projects?type=team');
		const teams = visible.filter((project) => project.type === 'team');
		const uniqueIds = new Set(teams.map(({ id }) => id));
		if (!Number.isSafeInteger(counts.team) || counts.team < 0 || uniqueIds.size !== teams.length) {
			throw new Error('Invalid team inventory. Refresh and rerun.');
		}
		summary.totalTeams = counts.team;
		summary.visibleTeams = teams.length;
		console.info(mode, {
			operator: summary.operator,
			reviewer: email,
			visible: teams.length,
			total: counts.team,
		});
		console.info('The reviewer can see results only for workflows they can edit.');
		if (apply && teams.length !== counts.team) {
			throw new Error(
				'All-team apply requires visibility of every team. Preview with this account or use an authorized operator.',
			);
		}
		for (const project of teams) {
			activeProject = project;
			activeItem = null;
			const start = entries.length;
			try {
				await configure('projects/' + encodeURIComponent(project.id));
			} catch (error) {
				if (!recoverable(error)) {
					record('Stopped', error.message);
					summary.incomplete++;
					throw error;
				}
				record('Failed', error.message);
			}
			const statuses = entries.slice(start).map((entry) => entry.status);
			if (statuses.includes('Skipped')) summary.skipped++;
			else if (
				statuses.some((status) => ['Failed', 'Blocked', 'Unknown outcome'].includes(status))
			) {
				summary.incomplete++;
			} else summary.completed++;
		}
	} catch (error) {
		summary.stopped = error.message;
	}
	if (summary.totalTeams !== null) {
		summary.unprocessed = Math.max(
			0,
			summary.totalTeams - summary.completed - summary.incomplete - summary.skipped,
		);
	}
	console.table([summary]);
	console.table(entries);
	return { summary, entries };
}
