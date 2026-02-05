export type DiagramElementType = "icon" | "box" | "text" | "arrow" | "line";

export type ArrowStyle = "solid" | "dashed";

export type ArrowEnds = "end" | "both";

export interface DiagramElementBase {
  id: string;
  type: DiagramElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  groupId?: string;
}

export interface DiagramIconElement extends DiagramElementBase {
  type: "icon";
  src: string;
  label?: string;
}

export interface DiagramBoxElement extends DiagramElementBase {
  type: "box";
  fill: string;
  border: string;
  borderWidth: number;
  radius: number;
  label?: string;
}

export interface DiagramTextElement extends DiagramElementBase {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
}

export interface DiagramArrowElement extends DiagramElementBase {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke: string;
  strokeWidth: number;
  style: ArrowStyle;
  arrowEnds?: ArrowEnds;
}

export interface DiagramLineElement extends DiagramElementBase {
  type: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  stroke: string;
  strokeWidth: number;
  style: ArrowStyle;
}

export type DiagramElement =
  | DiagramIconElement
  | DiagramBoxElement
  | DiagramTextElement
  | DiagramArrowElement
  | DiagramLineElement;

export interface DiagramDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  elements: DiagramElement[];
}

export interface StoredDiagramSummary {
  id: string;
  name: string;
  updatedAt: string;
}
