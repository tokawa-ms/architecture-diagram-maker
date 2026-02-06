import type { DiagramDocument, DiagramElement } from "./types";

const GRID_SIZE = 10;

const snapValue = (value: number, gridSize = GRID_SIZE) =>
  Math.round(value / gridSize) * gridSize;

const snapSize = (value: number) => {
  const snapped = Math.max(GRID_SIZE * 2, snapValue(value));
  const units = Math.round(snapped / GRID_SIZE);
  return units % 2 === 0 ? snapped : snapped + GRID_SIZE;
};

const snapRectByCenter = (args: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  const snappedWidth = snapSize(args.width);
  const snappedHeight = snapSize(args.height);
  const centerX = args.x + args.width / 2;
  const centerY = args.y + args.height / 2;
  const snappedCenterX = snapValue(centerX);
  const snappedCenterY = snapValue(centerY);
  return {
    x: snappedCenterX - snappedWidth / 2,
    y: snappedCenterY - snappedHeight / 2,
    width: snappedWidth,
    height: snappedHeight,
  };
};

const snapLinePoints = (args: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}) => {
  const startX = snapValue(args.startX);
  const startY = snapValue(args.startY);
  const endX = snapValue(args.endX);
  const endY = snapValue(args.endY);
  return {
    startX,
    startY,
    endX,
    endY,
    x: startX,
    y: startY,
    width: endX - startX,
    height: endY - startY,
  };
};

const snapElementToGrid = (element: DiagramElement): DiagramElement => {
  if (element.type === "arrow" || element.type === "line") {
    return {
      ...element,
      ...snapLinePoints({
        startX: element.startX,
        startY: element.startY,
        endX: element.endX,
        endY: element.endY,
      }),
    } as DiagramElement;
  }

  return {
    ...element,
    ...snapRectByCenter({
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    }),
  } as DiagramElement;
};

const baseElementDimensions = {
  width: 120,
  height: 80,
  rotation: 0,
  zIndex: 1,
  opacity: 1,
};

interface SampleLabels {
  name: string;
  apiGateway: string;
  apiManagement: string;
  logicApps: string;
  publishInterfaces: string;
}

export const createSampleDiagram = (labels: SampleLabels): DiagramDocument => {
  const now = new Date().toISOString();
  const sampleElements: DiagramElement[] = [
    {
      id: "icon-1",
      type: "icon",
      x: 120,
      y: 80,
      width: 96,
      height: 96,
      rotation: 0,
      zIndex: 2,
      opacity: 1,
      src: "/icons-sample/azure.svg",
      label: labels.apiGateway,
    },
    {
      id: "box-1",
      type: "box",
      x: 80,
      y: 60,
      width: 240,
      height: 160,
      rotation: 0,
      zIndex: 1,
      opacity: 0.9,
      fill: "#F8FAFC",
      border: "#94A3B8",
      borderWidth: 2,
      radius: 16,
      label: labels.apiManagement,
    },
    {
      id: "icon-2",
      type: "icon",
      x: 420,
      y: 120,
      width: 96,
      height: 96,
      rotation: 0,
      zIndex: 3,
      opacity: 1,
      src: "/icons-sample/logic-apps.svg",
      label: labels.logicApps,
    },
    {
      id: "text-1",
      type: "text",
      x: 120,
      y: 280,
      width: 240,
      height: 40,
      rotation: 0,
      zIndex: 4,
      opacity: 1,
      text: labels.publishInterfaces,
      fontSize: 16,
      color: "#0F172A",
    },
    {
      id: "arrow-1",
      type: "arrow",
      x: 260,
      y: 120,
      width: 180,
      height: 0,
      startX: 260,
      startY: 120,
      endX: 440,
      endY: 120,
      rotation: 0,
      zIndex: 2,
      opacity: 1,
      stroke: "#0F172A",
      strokeWidth: 2,
      style: "solid",
      arrowEnds: "end",
    },
    {
      id: "line-1",
      type: "line",
      x: 120,
      y: 340,
      width: 420,
      height: 0,
      startX: 120,
      startY: 340,
      endX: 540,
      endY: 340,
      rotation: 0,
      zIndex: 1,
      opacity: 0.8,
      stroke: "#64748B",
      strokeWidth: 2,
      style: "dashed",
    },
  ];
  return {
    id: "sample",
    name: labels.name,
    createdAt: now,
    updatedAt: now,
    elements: sampleElements.map((element) =>
      snapElementToGrid({
        ...baseElementDimensions,
        ...element,
      }),
    ),
  };
};
