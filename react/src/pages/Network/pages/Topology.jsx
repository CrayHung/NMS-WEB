// Topology.jsx
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
import { apiFetch } from '../../../lib/api';
import { mapApiToApp } from '../../../utils/mapApiToApp';

/* ---------------------- 顏色規則 ---------------------- */
const COLORS = {
  OK:   { bg: '#dcfce7', border: '#16a34a', pillBg: '#22c55e22', pillText: '#166534' }, // 綠
  WARN: { bg: '#fef9c3', border: '#eab308', pillBg: '#f59e0b22', pillText: '#7c2d12' }, // 黃
  DOWN: { bg: '#fee2e2', border: '#ef4444', pillBg: '#ef444422', pillText: '#7f1d1d' }, // 紅
};

// 依據需求決定節點顏色（gateway 與 device 分流）
function getNodeColors(data) {
  const online = data?.onlineStatus === true;
  const isGateway = (data?.type === 'gateway') || (!!data?.gatewayEui && !data?.deviceEui);
  if (isGateway) {
    // 1) gateway：只看 onlineStatus
    return online ? COLORS.OK : COLORS.DOWN;
  }
  // 2) device：看 onlineStatus + statusText
  if (!online) return COLORS.DOWN; // case3
  const st = data?.statusText;
  const abnormal = st != null && st !== 'Normal';
  return abnormal ? COLORS.WARN : COLORS.OK; // case1/2
}

/* ---------------------- 自訂節點 ---------------------- */
/**
 * DeviceNode
 * - 把 NodeToolbar 的 isVisible 改成看 data.hovered（滑鼠懸浮時顯示）
 * - 保留 selected 的陰影樣式，不改變原有「被選取時」的視覺
 */
function DeviceNode({ id, data, selected }) {
  const { bg, border, pillBg, pillText } = getNodeColors(data);

  const pill = (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        background: pillBg,
        color: pillText,
        marginLeft: 8,
        whiteSpace: 'nowrap',
      }}
      title={`statusText: ${data?.statusText ?? ''}`}
    >
      {data?.statusText ?? '—'}
    </span>
  );

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: '8px 12px',
        minWidth: 160,
        boxShadow: selected ? '0 4px 10px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.08)',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>
        {data?.label ?? data?.deviceName ?? 'device'}
      </div>
      <div style={{ fontSize: 11, opacity: 0.9, display: 'flex', alignItems: 'center' }}>
        <span>
          {(data?.type ?? '—')} · {(data?.onlineStatus === true ? 'online' : 'offline')}
        </span>
        {pill}
      </div>

      <Handle type="target" position={RFPosition.Top} />
      <Handle type="source" position={RFPosition.Bottom} />

      {/* ★ 由 selected 改為 data.hovered 控制顯示（hover 顯示、移開關閉） */}
      <NodeToolbar isVisible={!!data?.hovered} position={RFPosition.Top} align="center">
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
            {/* {data?.deviceId}  */}
            {data?.deviceName || data?.deviceId} 
          </div>
          <dl style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>

          {/* <div><dt style={{ display: 'inline', color: '#6b7280' }}>Type：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data?.deviceId}</dd></div> */}
            
          {/* <div><dt style={{ display: 'inline', color: '#6b7280' }}>device name</dt> <dd style={{ display: 'inline', margin: 0 }}>{data?.deviceName}</dd></div> */}
            
            
            <div><dt style={{ display: 'inline', color: '#6b7280' }}>Type：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data?.type}</dd></div>
            <div><dt style={{ display: 'inline', color: '#6b7280' }}>Status：</dt> <dd style={{ display: 'inline', margin: 0 }}>{data?.onlineStatus === true ? 'online' : 'offline'}</dd></div>
            {data?.statusText != null && (
              <div><dt style={{ display: 'inline', color: '#6b7280' }}>StatusText：</dt> <dd style={{ display: 'inline', margin: 0 }}>{String(data.statusText)}</dd></div>
            )}
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
              <div><dt style={{ display: 'inline', color: '#6b7280' }}>Updated：</dt> <dd style={{ display: 'inline', margin: 0 }}>{new Date(data.lastUpdated).toLocaleString("en-US")}</dd></div>
            )}
          </dl>
        </div>
      </NodeToolbar>
    </div>
  );
}

const nodeTypes = { device: DeviceNode };

/* ---------------------- dagre 佈局設定 ---------------------- */
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 180;
const nodeHeight = 48;
const DAGRE_LAYOUT = {
  nodesep: 90,
  ranksep: 160,
  edgesep: 60,
  marginx: 120,   // 左右留白更多
  marginy: 120,   // 上下留白更多
  ranker: 'tight-tree',
};

/* ---------------------- 資料 → nodes/edges ---------------------- */
function devicesToNodes(deviceData) {
  return (deviceData ?? []).map((d) => ({
    id: d.deviceId,
    type: 'device',
    data: {
      // Label 與基本屬性
 
      label: d?.data?.label ?? d.serialNumber ?? d.deviceId,
      deviceId: d.deviceId,
      deviceName: d.serialNumber,
      type: d.type,

      // 供顏色規則判斷的關鍵欄位
      onlineStatus: d.onlineStatus === true,
      statusText: d.statusText ?? d?.data?.statusText ?? null,
      deviceEui: d.deviceEui ?? d?.data?.deviceEui ?? null,
      gatewayEui: d.gatewayEui ?? d?.gateway?.gatewayEui ?? d?.data?.gatewayEui ?? null,

      // 其它可選資訊
      lastUpdated: d.lastUpdated,
      batteryLevel: d.batteryLevel,
      temperature: d.temperature,
      humidity: d.humidity,

      // ★ 新增：hover 狀態（預設 false）
      hovered: Boolean(d.hovered),
    },
    // 位置會被 dagre 覆寫
    position: d.position ?? { x: 0, y: 0 },
  }));
}

function linksToEdges(deviceLink) {
  return (deviceLink ?? [])
    .filter((e) => e.source && e.target)
    .map((e) => ({
      id: String(e.id),
      source: e.source,
      target: e.target,
      type: ConnectionLineType.SmoothStep,
      animated: true,
      style: { strokeWidth: 2 },
      pathOptions: { offset: 12, borderRadius: 8 },
    }));
}

/* ---------------------- 佈局 ---------------------- */
function getLayoutedElements(nodes, edges, direction = 'TB') {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: DAGRE_LAYOUT.nodesep,
    ranksep: DAGRE_LAYOUT.ranksep,
    edgesep: DAGRE_LAYOUT.edgesep,
    marginx: DAGRE_LAYOUT.marginx,
    marginy: DAGRE_LAYOUT.marginy,
    ranker: DAGRE_LAYOUT.ranker,
  });

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

/* ---------------------- 主元件 ---------------------- */
export default function Topology() {
  const [deviceData, setDeviceData] = useState([]);   // nodes 原始資料（非 ReactFlow nodes）
  const [deviceLink, setDeviceLink] = useState([]);   // edges 原始資料（非 ReactFlow edges）
  const [rawData, setRawData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // 目前滑鼠懸浮的節點 id（僅用於將 hovered 寫入 node.data）
  const [hoverNodeId, setHoverNodeId] = useState(null);

  // 初始化抓資料
  useEffect(() => {
    const ctrl = new AbortController();
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/amplifier/devices', { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        setRawData(json);

        const { nodes, links } = mapApiToApp(json, deviceData, deviceLink);
        setDeviceData(nodes);
        setDeviceLink(links);
      } catch (e) {
        if (e.name !== 'AbortError') setError(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => ctrl.abort();
  }, []);

  // 初始佈局
  const { nodes: layoutedNodes0, edges: layoutedEdges0 } = useMemo(() => {
    const n = devicesToNodes(deviceData);
    const e = linksToEdges(deviceLink);
    return getLayoutedElements(n, e, 'TB');
  }, [deviceData, deviceLink]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes0);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges0);
  const [direction, setDirection] = useState('TB');

  // 資料變動 → 重佈局
  useEffect(() => {
    const n = devicesToNodes(deviceData);
    const e = linksToEdges(deviceLink);
    const { nodes: nl, edges: el } = getLayoutedElements(n, e, direction);
    setNodes(nl);
    setEdges(el);
  }, [deviceData, deviceLink, direction]);

  /* ----------- 連線（拖線時）保留原有功能 ----------- */
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: ConnectionLineType.SmoothStep,
            animated: true,
            style: { strokeWidth: 2 },
            pathOptions: { offset: 12, borderRadius: 8 },
          },
          eds
        )
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

  /* ----------- 滑鼠懸浮顯示 / 移開隱藏 NodeToolbar ----------- */
  const showHoverFor = useCallback((id) => {
    setHoverNodeId(id);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, hovered: true } }
          : (n.data?.hovered ? { ...n, data: { ...n.data, hovered: false } } : n)
      )
    );
  }, [setNodes]);

  const clearHover = useCallback((id) => {
    setHoverNodeId((curr) => (curr === id ? null : curr));
    setNodes((nds) =>
      nds.map((n) => (n.data?.hovered ? { ...n, data: { ...n.data, hovered: false } } : n))
    );
  }, [setNodes]);

  /**
   * 注意：
   * - 使用 ReactFlow 的 onNodeMouseEnter / onNodeMouseLeave（不會影響點擊、拖曳、連線等原功能）
   * - NodeToolbar 會跟著 data.hovered 顯示/關閉
   * - 若你希望滑到 Toolbar 上也不會關閉，可把 Toolbar 放大些或調整位置，
   *   若仍有閃爍，可進一步在節點外層加上延時（本版先保持即時關閉以符合「移開就關閉」）
   */
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionLineType={ConnectionLineType.SmoothStep}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.4, includeHiddenNodes: true }}
      proOptions={{ hideAttribution: true }}
          zoomOnScroll
      minZoom={0.4}
      maxZoom={1.5}

      /* ★ 新增：滑鼠懸浮事件 */
      onNodeMouseEnter={(_, node) => showHoverFor(node?.id)}
      onNodeMouseLeave={(_, node) => clearHover(node?.id)}
    />
  );
}
