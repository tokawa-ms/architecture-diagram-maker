import type { DiagramDocument, DiagramElement } from "./types";

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
    elements: sampleElements.map((element) => ({
      ...baseElementDimensions,
      ...element,
    })),
  };
};
