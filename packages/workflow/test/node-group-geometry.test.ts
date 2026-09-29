import {
	GROUP_HEADER_WIDTH_COLLAPSED,
	GROUP_PADDING_X,
	GROUP_PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP,
	computeGroupFrameRects,
} from '../src/node-group-geometry';

describe('node group geometry', () => {
	it('computes collapsed and expanded group frames from member bounds', () => {
		const nodesRect = { x: 120, y: 240, width: 320, height: 180 };
		const groupHeaderHeight = 48;
		const { collapsed, expanded } = computeGroupFrameRects(nodesRect, groupHeaderHeight);

		expect(collapsed).toEqual({
			x: nodesRect.x - GROUP_PADDING_X,
			y: nodesRect.y - GROUP_PADDING_Y_TOP - groupHeaderHeight,
			width: GROUP_HEADER_WIDTH_COLLAPSED,
			height: groupHeaderHeight,
		});
		expect(expanded).toEqual({
			x: collapsed.x,
			y: collapsed.y,
			width: nodesRect.width + 2 * GROUP_PADDING_X,
			height: groupHeaderHeight + nodesRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		});
	});

	it('floors expanded width at the collapsed chip width', () => {
		const { expanded } = computeGroupFrameRects({ x: 0, y: 0, width: 10, height: 100 }, 48);

		expect(expanded.width).toBe(GROUP_HEADER_WIDTH_COLLAPSED);
	});
});
