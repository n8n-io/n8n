const byId = (id) => document.getElementById(id);
let config;
let refreshing = false;
let acting = false;
const responses = new Map();
let renderedSignature = '';
let renderedCards = [];

function element(tag, text, className) {
	const node = document.createElement(tag);
	if (text !== undefined) node.textContent = text;
	if (className) node.className = className;
	return node;
}

function link(text, url) {
	const node = element('a', text);
	node.href = url;
	node.target = '_blank';
	node.rel = 'noreferrer';
	return node;
}

function notice(text, failed = false) {
	byId('notice').textContent = text;
	byId('notice').hidden = !text;
	byId('notice').className = failed ? 'error' : 'good';
}

async function api(path, body) {
	const response = await fetch(
		`/api/${path}`,
		body === undefined
			? {}
			: {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				},
	);
	const data = await response.json();
	if (!response.ok)
		throw new Error(data.error ?? `Request failed (${response.status}). Refresh and try again.`);
	return data;
}

async function act(handleAction) {
	if (acting) return;
	acting = true;
	document.querySelectorAll('button').forEach((button) => {
		button.disabled = true;
	});
	notice('Working…');
	try {
		await handleAction();
	} catch (error) {
		notice(error.message, true);
	} finally {
		acting = false;
		await refresh();
		document.querySelectorAll('button').forEach((button) => {
			button.disabled = button.dataset.unavailable === 'true';
		});
	}
}

function button(text, handleAction, className, unavailable = false) {
	const node = element('button', text, className);
	node.disabled = acting || unavailable;
	node.dataset.unavailable = String(unavailable);
	node.addEventListener('click', () => act(handleAction));
	return node;
}

function renderScenarios() {
	for (const scenario of config.scenarios) {
		const card = element('article', undefined, 'scenario');
		card.append(
			element('span', scenario.outcome, 'badge'),
			element('h3', scenario.name),
			element('p', scenario.description),
		);
		card.append(
			button(
				'Create and publish',
				async () => {
					const result = await api('workflows', {
						scenarioId: scenario.id,
						projectId: byId('project-id').value.trim(),
					});
					notice(
						result.warning
							? `Workflow ${result.id} was created, but publication failed. ${result.warning}`
							: 'Workflow created and published. Configure self-healing in its n8n project, then send the original input.',
						Boolean(result.warning),
					);
				},
				'primary',
				!config.hasApiKey,
			),
		);
		byId('scenarios').append(card);
	}
}

async function loadExecutions(workflow, container) {
	try {
		const { executions } = await api(`workflows/${encodeURIComponent(workflow.id)}/executions`);
		container.replaceChildren();
		if (!executions.length)
			container.append(element('p', 'No saved executions yet. Send an input to start.'));
		for (const execution of executions) {
			const row = element('div', undefined, 'execution');
			row.append(
				element(
					'span',
					execution.status,
					`badge ${execution.status === 'success' ? 'good' : execution.status === 'error' ? 'error' : ''}`,
				),
				link(`Execution ${execution.id} ↗`, execution.url),
				element('span', execution.mode),
			);
			if (execution.startedAt)
				row.append(element('time', new Date(execution.startedAt).toLocaleString()));
			container.append(row);
		}
	} catch (error) {
		container.replaceChildren(element('p', error.message, 'error'));
	}
}

function renderWorkflow(workflow) {
	const scenario = config.scenarios.find(({ id }) => id === workflow.scenarioId);
	const card = element('article', undefined, 'workflow');
	const heading = element('div', undefined, 'workflow-heading');
	heading.append(
		element('h3', workflow.name),
		element(
			'span',
			workflow.archived
				? 'Archived'
				: workflow.fullyPublished
					? 'Published'
					: workflow.published
						? 'Unpublished changes'
						: 'Draft',
			`badge ${workflow.fullyPublished ? 'good' : 'warning'}`,
		),
	);
	card.append(heading, element('p', scenario.expectation));
	const actions = element('div', undefined, 'actions');
	for (const [input, label] of [
		['original', 'Send original input'],
		['alternate', 'Send alternate input'],
	]) {
		actions.append(
			button(
				label,
				async () => {
					const result = await api(`workflows/${encodeURIComponent(workflow.id)}/trigger`, {
						input,
					});
					responses.set(workflow.id, `HTTP ${result.status}\n${result.body}`);
					if (result.status === 404) {
						notice(
							'The webhook returned HTTP 404. Registration can take a moment after publication. Check Executions, then try again. If this continues, check N8N_WEBHOOK_BASE_URL.',
							true,
						);
						return;
					}
					notice(
						`Input sent to ${scenario.name} (HTTP ${result.status}). Check the saved execution below. Self-healing runs in the background; check Inbox for its result.`,
					);
				},
				input === 'original' ? 'primary' : '',
				!workflow.fullyPublished || workflow.archived,
			),
		);
	}
	if (!workflow.fullyPublished && !workflow.archived) {
		actions.append(
			button('Publish current draft', async () => {
				await api(`workflows/${encodeURIComponent(workflow.id)}/publish`, {});
				notice('Current draft published. Send an input to test it.');
			}),
		);
	}
	actions.append(
		link('Open workflow ↗', workflow.workflowUrl),
		link('All executions ↗', workflow.executionsUrl),
	);
	if (workflow.settingsUrl) actions.append(link('Project settings ↗', workflow.settingsUrl));
	card.append(actions);
	const executions = element('div', undefined, 'executions');
	executions.append(element('p', 'Loading recent executions…'));
	card.append(executions);
	const details = element('details');
	details.append(
		element('summary', 'Inputs and last webhook response'),
		element('h4', 'Original input'),
		element('pre', JSON.stringify(scenario.input, null, 2)),
		element('h4', 'Alternate input'),
		element('pre', JSON.stringify(scenario.alternateInput, null, 2)),
		element('h4', 'Last response'),
		element('pre', responses.get(workflow.id) ?? 'No input sent from this dashboard session.'),
	);
	card.append(details);
	return { card, load: () => loadExecutions(workflow, executions) };
}

async function refresh() {
	if (refreshing) return;
	refreshing = true;
	try {
		const { workflows } = await api('workflows');
		byId('connection').textContent = 'Connected';
		byId('connection').className = 'badge good';
		byId('count').textContent = `(${workflows.length})`;
		const signature = JSON.stringify([workflows, [...responses]]);
		if (signature !== renderedSignature) {
			renderedCards = workflows.map(renderWorkflow);
			byId('workflows').replaceChildren(...renderedCards.map(({ card }) => card));
			if (!renderedCards.length)
				byId('workflows').append(
					element(
						'p',
						'No test workflows yet. Choose a scenario to create your first workflow.',
						'empty',
					),
				);
			renderedSignature = signature;
		}
		// Keep polling light on a local instance that is also running the Assistant.
		for (const card of renderedCards) await card.load();
	} catch (error) {
		renderedSignature = '';
		byId('connection').textContent = 'Connection needs attention';
		byId('connection').className = 'badge warning';
		byId('workflows').replaceChildren(element('p', error.message, 'empty'));
	} finally {
		refreshing = false;
	}
}

try {
	config = await api('config');
	byId('instance').textContent = config.baseUrl;
	byId('open-inbox').href = `${config.editorUrl}/inbox`;
	renderScenarios();
	byId('refresh').addEventListener('click', refresh);
	await refresh();
	setInterval(() => {
		if (!document.hidden && !acting) void refresh();
	}, 10000);
} catch (error) {
	notice(error.message, true);
}
