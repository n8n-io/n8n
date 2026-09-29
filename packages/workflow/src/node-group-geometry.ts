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
/** Fixed width when collapsed; also the minimum width when expanded. */
export const GROUP_HEADER_WIDTH_COLLAPSED = 400;

/**
 * Collapsed chip and expanded frame rects for a group, in unsnapped canvas space.
 * The caller provides the title bar height so this shared helper does not
 * duplicate the canvas node-size constant.
 */
export function computeGroupFrameRects(
	nodesRect: NodeGroupRect,
	groupHeaderHeight: number,
): NodeGroupFrameRects {
	const x = nodesRect.x - GROUP_PADDING_X;
	const y = nodesRect.y - GROUP_PADDING_Y_TOP - groupHeaderHeight;
	return {
		collapsed: { x, y, width: GROUP_HEADER_WIDTH_COLLAPSED, height: groupHeaderHeight },
		expanded: {
			x,
			y,
			width: Math.max(nodesRect.width + 2 * GROUP_PADDING_X, GROUP_HEADER_WIDTH_COLLAPSED),
			height: groupHeaderHeight + nodesRect.height + GROUP_PADDING_Y_TOP + GROUP_PADDING_Y_BOTTOM,
		},
	};
}
