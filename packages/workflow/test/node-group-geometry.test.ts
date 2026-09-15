import {
	GROUP_HEADER_HEIGHT,
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP,
	computeGroupFrameRects,
} from '../src/node-group-geometry';

describe('node group geometry', () => {
	it('computes collapsed and expanded group frames from member bounds', () => {
		const nodesRect = { x: 120, y: 240, width: 320, height: 180 };
		const { collapsed, expanded } = computeGroupFrameRects(nodesRect);

		expect(collapsed).toEqual({
			x: nodesRect.x - GROUP_PADDING_X,
			y: nodesRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT,
			width: GROUP_HEADER_WIDTH_COLLAPSED,
			height: GROUP_HEADER_HEIGHT,
		});
		expect(expanded).toEqual({
			x: collapsed.x,
			y: collapsed.y,
			width: nodesRect.width + 2 * GROUP_PADDING_X,
			height: GROUP_HEADER_HEIGHT + nodesRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		});
	});

	it('floors expanded width at the collapsed chip width', () => {
		const { expanded } = computeGroupFrameRects({ x: 0, y: 0, width: 10, height: 100 });

		expect(expanded.width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});

	it('keeps the shared header height aligned with the canvas default node height', () => {
		expect(GROUP_HEADER_HEIGHT).toBe(96);
	});
});
