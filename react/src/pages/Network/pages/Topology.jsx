// Topology.jsx
// 原本 Network.jsx 的拓樸內容搬到這裡
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  NodeToolbar,
  Handle,
  Position as RFPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useGlobalContext } from '../../../GlobalContext';
import {apiUrl,apiFetch} from '../../../lib/api'

// === 顏色：布林狀態 ===
const colorFor = (online) => (online ? '#dcfce7' : '#fee2e2');   // true=綠底 / false=紅底
const borderFor = (online) => (online ? '#16a34a' : '#ef4444');  // true=綠線 / false=紅線

// 自訂節點：顯示 label；被選中時顯示 NodeToolbar 當 InfoWindow
function DeviceNode({ data, selected }) {
  const online = !!data?.onlineStatus;
  const color = colorFor(online);
  const border = borderFor(online);

  return (
    <div
      style={{
        background: color,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: '8px 12px',
        minWidth: 140,
        boxShadow: selected ? '0 4px 10px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.08)',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>
        {data?.label ?? data?.deviceName ?? 'device'}
      </div>
      <div style={{ fontSize: 11, opacity: 0.8 }}>
        {data?.type ?? '—'} · {online ? 'online' : 'offline'}
      </div>

      <Handle type="target" position={RFPosition.Top} />
      <Handle type="source" position={RFPosition.Bottom} />

      <NodeToolbar isVisible={selected} position={RFPosition.Top} align="center">
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 12,
            minWidth: 220,
            boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {data?.deviceName ?? data?.label}
          </div>
          <dl style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
            <div><dt style={{ display: 'inline', color: '#6b7280' }}>ID：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data?.deviceId}</dd></div>
            <div><dt style={{ display: 'inline', color: '#6b7280' }}>Type：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data?.type}</dd></div>
            <div><dt style={{ display: 'inline', color: '#6b7280' }}>Status：</dt> <dd style={{ display: 'inline', margin: 0 }}>{online ? 'online' : 'offline'}</dd></div>
            {data?.batteryLevel != null && (
              <div><dt style={{ display: 'inline', color: '#6b7280' }}>Battery：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data.batteryLevel}%</dd></div>
            )}
            {data?.temperature != null && (
              <div><dt style={{ display: 'inline', color: '#6b7280' }}>Temp：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data.temperature}°C</dd></div>
            )}
            {data?.humidity != null && (
              <div><dt style={{ display: 'inline', color: '#6b7280' }}>Humidity：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data.humidity}%</dd></div>
            )}
            {data?.lastUpdated && (
              <div><dt style={{ display: 'inline', color: '#6b7280' }}>Updated：</dt> <dd style={{ display: 'inline', margin: 0 }}>{new Date(data.lastUpdated).toLocaleString()}</dd></div>
            )}
          </dl>
        </div>
      </NodeToolbar>
    </div>
  );
}

const nodeTypes = { device: DeviceNode };

// ---- dagre 設定 ----
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 172;
const nodeHeight = 36;

/** 把全域 deviceData 轉成 React Flow nodes（onlineStatus→布林） */
function devicesToNodes(deviceData) {
  return (deviceData ?? []).map((d) => ({
    id: d.deviceId,
    type: 'device',
    data: {
      label: d?.data?.label ?? d.deviceName ?? d.deviceId,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      type: d.type,
      onlineStatus: Boolean(d.onlineStatus),
      lastUpdated: d.lastUpdated,
      batteryLevel: d.batteryLevel,
      temperature: d.temperature,
      humidity: d.humidity,
    },
    position: d.position ?? { x: 0, y: 0 },
  }));
}

/** 把全域 deviceLink 轉成 React Flow edges */
function linksToEdges(deviceLink) {
  return (deviceLink ?? [])
    .filter((e) => e.source && e.target)
    .map((e) => ({
      id: String(e.id),
      source: e.source,
      target: e.target,
      type: ConnectionLineType.SmoothStep,
      animated: true,
    }));
}

/** 依方向（TB/LR）做 dagre 佈局 */
function getLayoutedElements(nodes, edges, direction = 'TB') {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const p = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: { x: p.x - nodeWidth / 2, y: p.y - nodeHeight / 2 },
    };
  });

  return { nodes: newNodes, edges };
}

export default function Topology() {
  const { deviceData, deviceLink, setDeviceLink } = useGlobalContext();

  // 初始化佈局
  const { nodes: layoutedNodes0, edges: layoutedEdges0 } = useMemo(() => {
    const n = devicesToNodes(deviceData);
    const e = linksToEdges(deviceLink);
    return getLayoutedElements(n, e, 'TB');
  }, [deviceData, deviceLink]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes0);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges0);

  const [direction, setDirection] = useState('TB');

  // 全域資料變動 → 重佈局
  useEffect(() => {
    const n = devicesToNodes(deviceData);
    const e = linksToEdges(deviceLink);
    const { nodes: nl, edges: el } = getLayoutedElements(n, e, direction);
    setNodes(nl);
    setEdges(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceData, deviceLink, direction]);

  // 連線（拖線時）
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
      );
      setDeviceLink((links) => [
        ...links,
        {
          id: `e${params.source}-${params.target}-${Date.now()}`,
          source: params.source,
          target: params.target,
          type: 'smoothstep',
          animated: true,
        },
      ]);
    },
    [setEdges, setDeviceLink]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
      nodeTypes={nodeTypes}
    />
  );
}
