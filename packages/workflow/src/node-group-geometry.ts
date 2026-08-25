export interface NodeGroupRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface NodeGroupFrameRects {
	collapsed: NodeGroupRect;
	expanded: NodeGroupRect;
}

export const GROUP_PADDING_X = 56;
export const GROUP_PADDING_Y_TOP = 40;
export const GROUP_PADDING_Y_BOTTOM = 88;
/** Must match the canvas default node height. */
export const GROUP_HEADER_HEIGHT = 96;
/** Fixed width when collapsed; also the minimum width when expanded. */
export const GROUP_HEADER_WIDTH_COLLAPSED = 400;

/**
 * Collapsed chip and expanded frame rects for a group, in unsnapped canvas space.
 */
export function computeGroupFrameRects(nodesRect: NodeGroupRect): NodeGroupFrameRects {
	const x = nodesRect.x - GROUP_PADDING_X;
	const y = nodesRect.y - GROUP_PADDING_Y_TOP - GROUP_HEADER_HEIGHT;
	return {
		collapsed: { x, y, width: GROUP_HEADER_WIDTH_COLLAPSED, height: GROUP_HEADER_HEIGHT },
		expanded: {
			x,
			y,
			width: Math.max(nodesRect.width + 2 * GROUP_PADDING_X, GROUP_HEADER_WIDTH_COLLAPSED),
			height: GROUP_HEADER_HEIGHT + nodesRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		},
	};
}
