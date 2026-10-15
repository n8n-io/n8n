const storageKey = 'n8n-memory-dashboard-v1';
const columns = 12;

export const dashboardCards = [
	{ id: 'timeline-section', title: 'timeline', x: 0, y: 0, w: 12, h: 8, minW: 4, minH: 6 },
	{ id: 'requests-section', title: 'requests', x: 0, y: 8, w: 12, h: 7, minW: 3, minH: 4 },
	{ id: 'controls', title: 'markersAndSnapshots', x: 0, y: 15, w: 4, h: 6, minW: 3, minH: 3 },
	{ id: 'allocations-section', title: 'allocations', x: 4, y: 15, w: 8, h: 6, minW: 3, minH: 4 },
	{ id: 'constructors-section', title: 'constructors', x: 4, y: 15, w: 8, h: 6, minW: 3, minH: 4 },
	{ id: 'statistics-section', title: 'statistics', x: 0, y: 21, w: 6, h: 5, minW: 3, minH: 3 },
	{ id: 'markers-section', title: 'markers', x: 6, y: 21, w: 6, h: 5, minW: 3, minH: 3 },
	{ id: 'details-section', title: 'captureDetails', x: 0, y: 26, w: 6, h: 5, minW: 3, minH: 3 },
	{ id: 'artifacts-section', title: 'artifacts', x: 6, y: 26, w: 6, h: 5, minW: 3, minH: 3 },
];

function boundedInteger(value, fallback, min, max) {
	return Math.max(min, Math.min(max, Number.isInteger(value) ? value : fallback));
}

// Accept only known cards and bounded dimensions from browser storage.
export function normalizeDashboardLayout(saved) {
	const stored = saved?.version === 1 && Array.isArray(saved.cards) ? saved.cards : [];
	return dashboardCards.map((card) => {
		const previous = stored.find((entry) => entry?.id === card.id);
		const w = boundedInteger(previous?.w, card.w, card.minW, columns);
		return {
			id: card.id,
			x: boundedInteger(previous?.x, card.x, 0, columns - w),
			y: boundedInteger(previous?.y, card.y, 0, 10_000),
			w,
			h: boundedInteger(previous?.h, card.h, card.minH, 100),
			hidden: previous?.hidden === true,
		};
	});
}

export function initializeDashboard({ t, onLayoutChange = () => {} }) {
	const element = (id) => document.getElementById(id);
	let saved;
	try {
		saved = JSON.parse(localStorage.getItem(storageKey));
	} catch {
		// Browser storage can be unavailable or contain an older value.
	}
	const state = new Map(normalizeDashboardLayout(saved).map((card) => [card.id, card]));
	const available = new Map();
	const wrappers = new Map();
	let building = false;
	let updating = true;

	function rememberPositions() {
		if (grid?.getColumn() !== columns) return;
		for (const node of grid.engine.nodes) {
			const card = state.get(node.el.dataset.cardId);
			if (!card) continue;
			for (const key of ['x', 'y', 'w', 'h']) card[key] = node[key];
		}
	}

	function persist() {
		rememberPositions();
		try {
			localStorage.setItem(storageKey, JSON.stringify({ version: 1, cards: [...state.values()] }));
		} catch {
			// Keep the layout usable when browser storage is disabled.
		}
	}

	function refreshChooser() {
		const select = element('add-card-select');
		const previous = select.value;
		select.replaceChildren();
		for (const card of dashboardCards) {
			if (!available.get(card.id) || !state.get(card.id).hidden) continue;
			const option = document.createElement('option');
			option.value = card.id;
			option.textContent = t(card.title);
			select.append(option);
		}
		if ([...select.options].some((option) => option.value === previous)) select.value = previous;
		if (!select.options.length) {
			const option = document.createElement('option');
			option.textContent = t('noCardsToAdd');
			option.value = '';
			select.append(option);
		}
		select.disabled = !select.value;
		element('add-card').disabled = !select.value;
	}

	function notify() {
		persist();
		refreshChooser();
		onLayoutChange();
	}

	function showCard(id) {
		const wrapper = wrappers.get(id);
		const section = element(id);
		const visible = available.get(id) && !state.get(id).hidden;
		if (!visible && wrapper.gridstackNode) {
			rememberPositions();
			grid.removeWidget(wrapper, false, false);
		}
		wrapper.hidden = !visible;
		section.hidden = !visible;
		if (visible && !wrapper.gridstackNode) {
			const definition = dashboardCards.find((card) => card.id === id);
			grid.makeWidget(wrapper, {
				...state.get(id),
				minW: definition.minW,
				minH: definition.minH,
			});
		}
	}

	function moveWithKeyboard(event, id, resizing) {
		const directions = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		const direction = directions[event.key];
		if (!building || !direction) return;
		event.preventDefault();
		const wrapper = wrappers.get(id);
		const node = wrapper.gridstackNode;
		if (!node) return;
		const definition = dashboardCards.find((card) => card.id === id);
		const width = grid.getColumn();
		const options =
			resizing || event.shiftKey
				? {
						w: Math.max(
							Math.min(definition.minW, width),
							Math.min(width - node.x, node.w + direction[0]),
						),
						h: Math.max(definition.minH, node.h + direction[1]),
					}
				: {
						x: Math.max(0, Math.min(width - node.w, node.x + direction[0])),
						y: Math.max(0, node.y + direction[1]),
					};
		grid.update(wrapper, options);
		element('layout-status').textContent = `${t(definition.title)}: ${t('layoutChanged')}`;
		notify();
	}

	for (const card of dashboardCards) {
		const section = element(card.id);
		available.set(card.id, !section.hidden);
		const wrapper = document.createElement('div');
		wrapper.className = 'grid-stack-item dashboard-card';
		wrapper.dataset.cardId = card.id;
		section.before(wrapper);
		wrapper.append(section);
		section.classList.add('grid-stack-item-content');
		wrappers.set(card.id, wrapper);
		const tools = document.createElement('div');
		tools.className = 'card-tools';
		tools.hidden = true;
		for (const [key, className, resize] of [
			['moveCard', 'card-drag-handle', false],
			['resizeCard', 'card-keyboard-resize', true],
		]) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = className;
			button.textContent = `${resize ? '↔' : '⠿'} ${t(key)}`;
			button.setAttribute('aria-label', `${t(key)}: ${t(card.title)}`);
			button.title = t(resize ? 'resizeCardHelp' : 'moveCardHelp');
			button.addEventListener('keydown', (event) => moveWithKeyboard(event, card.id, resize));
			tools.append(button);
		}
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.textContent = '×';
		remove.setAttribute('aria-label', `${t('removeCard')}: ${t(card.title)}`);
		remove.title = t('removeCard');
		remove.addEventListener('click', () => {
			state.get(card.id).hidden = true;
			showCard(card.id);
			notify();
			element('toggle-layout').focus();
		});
		tools.append(remove);
		section.prepend(tools);
		wrapper.hidden = true;
	}

	const grid = globalThis.GridStack.init(
		{
			column: columns,
			columnOpts: { breakpoints: [{ w: 848, c: 1 }] },
			cellHeight: '4rem',
			margin: '0.5rem',
			mode: 'top',
			auto: false,
			handle: '.card-drag-handle',
			staticGrid: true,
			alwaysShowResizeHandle: true,
			resizable: { handles: 'se' },
		},
		element('dashboard'),
	);
	grid.batchUpdate();
	for (const card of dashboardCards) showCard(card.id);
	grid.batchUpdate(false);
	updating = false;
	grid.on('change', () => {
		if (!updating) notify();
	});
	grid.on('resizestop', onLayoutChange);
	grid.on('resizecontent', onLayoutChange);
	refreshChooser();

	element('toggle-layout').addEventListener('click', () => {
		building = !building;
		element('toggle-layout').setAttribute('aria-pressed', String(building));
		element('toggle-layout-label').textContent = t(building ? 'finishLayout' : 'customizeLayout');
		element('toggle-layout').querySelector('.button-icon').className =
			`button-icon ${building ? 'icon-check' : 'icon-edit'}`;
		element('layout-actions').hidden = !building;
		element('layout-help').hidden = !building;
		element('dashboard').classList.toggle('dashboard-building', building);
		for (const wrapper of wrappers.values())
			wrapper.querySelector('.card-tools').hidden = !building;
		grid.setStatic(!building);
		onLayoutChange();
	});
	element('add-card').addEventListener('click', () => {
		const id = element('add-card-select').value;
		if (!available.get(id)) return;
		state.get(id).hidden = false;
		showCard(id);
		notify();
		wrappers.get(id).querySelector('.card-drag-handle').focus();
	});
	element('reset-layout').addEventListener('click', () => {
		updating = true;
		grid.batchUpdate();
		for (const card of normalizeDashboardLayout()) {
			state.set(card.id, card);
			showCard(card.id);
			if (wrappers.get(card.id).gridstackNode) grid.update(wrappers.get(card.id), card);
		}
		grid.compact();
		grid.batchUpdate(false);
		updating = false;
		notify();
	});

	return {
		setAvailable(id, value) {
			if (!state.has(id) || available.get(id) === value) return;
			available.set(id, value);
			showCard(id);
			refreshChooser();
			onLayoutChange();
		},
	};
}
