export const HEADER = 40; // px
export const PAD = 12; // px (vertical padding inside node)
export const PORT_H = 16; // px (port row height)
export const GAP = 8; // px (vertical gap between ports)
export const PORT_CENTER_OFFSET = PORT_H / 2; // px

export const NODE_WIDTH_COMPACT = 180; // px
export const NODE_WIDTH_DEFAULT = 240; // px

export function getNodeWidth(compact?: boolean) {
  return compact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT;
}

