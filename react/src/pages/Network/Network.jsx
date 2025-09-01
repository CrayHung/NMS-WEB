// Network.jsx..只做顯示 不在此頁新增node
//React flow 詳細教學
//https://www.youtube.com/watch?v=rk_WSjrmHp8
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Background,
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  NodeToolbar, Handle, Position as RFPosition
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';
import { useGlobalContext } from '../../GlobalContext'

// 依狀態決定node底色
const statusColors = {
  online:  '#dcfce7', // 綠
  warning: '#ffedd5', // 橘
  offline: '#fee2e2', // 紅
};

// 文字邊框顏色
const statusBorders = {
  online:  '#16a34a',
  warning: '#f59e0b',
  offline: '#ef4444',
};

// 自訂節點：顯示 label；被選中時顯示 NodeToolbar 當 InfoWindow
function DeviceNode({ data, selected }) {
  const color = statusColors[data?.status] ?? '#f3f4f6';  //輝
  const border = statusBorders[data?.status] ?? '#f3f4f6';  

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
        {data?.type ?? '—'} · {data?.status ?? '—'}
      </div>

      {/* 需要端點可以保留/移除；這裡示範上下各一個 Handle */}
      <Handle type="target" position={RFPosition.Top} />
      <Handle type="source" position={RFPosition.Bottom} />

      {/* InfoWindow：節點被選取時顯示 */}
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
            <div><dt style={{ display:'inline', color:'#6b7280' }}>ID：</dt> <dd style={{ display:'inline', margin:0 }}>{data?.deviceId}</dd></div>
            <div><dt style={{ display:'inline', color:'#6b7280' }}>Type：</dt> <dd style={{ display:'inline', margin:0 }}>{data?.type}</dd></div>
            <div><dt style={{ display:'inline', color:'#6b7280' }}>Status：</dt> <dd style={{ display:'inline', margin:0 }}>{data?.status}</dd></div>
            {data?.batteryLevel != null && (
              <div><dt style={{ display:'inline', color:'#6b7280' }}>Battery：</dt> <dd style={{ display:'inline', margin:0 }}>{data.batteryLevel}%</dd></div>
            )}
            {data?.temperature != null && (
              <div><dt style={{ display:'inline', color:'#6b7280' }}>Temp：</dt> <dd style={{ display:'inline', margin:0 }}>{data.temperature}°C</dd></div>
            )}
            {data?.humidity != null && (
              <div><dt style={{ display:'inline', color:'#6b7280' }}>Humidity：</dt> <dd style={{ display:'inline', margin:0 }}>{data.humidity}%</dd></div>
            )}
            {data?.lastUpdated && (
              <div><dt style={{ display:'inline', color:'#6b7280' }}>Updated：</dt> <dd style={{ display:'inline', margin:0 }}>{new Date(data.lastUpdated).toLocaleString()}</dd></div>
            )}
          </dl>
        </div>
      </NodeToolbar>
    </div>
  );
}

// 把自訂節點註冊進 nodeTypes
const nodeTypes = { device: DeviceNode };




// ---- dagre 設定 ----
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 172;
const nodeHeight = 36;

/** 把全域 deviceData 轉成 React Flow nodes */
function devicesToNodes(deviceData) {
  return (deviceData ?? []).map((d) => ({
    id: d.deviceId,
    type: 'device', // 使用自訂節點
    data: {
      // InfoWindow & 顏色所需資訊都塞進來
      label: d?.data?.label ?? d.deviceName ?? d.deviceId,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      type: d.type,
      status: d.status,              // ← 用這個決定顏色
      lastUpdated: d.lastUpdated,
      batteryLevel: d.batteryLevel,
      temperature: d.temperature,
      humidity: d.humidity,
    },
    position: d.position ?? { x: 0, y: 0 },
  }));
}


/** 把全域 deviceLink 轉成 React Flow edges */
// function linksToEdges(deviceLink) {
//   return (deviceLink ?? []).map((e) => ({
//     id: e.id ?? `e${e.source}-${e.target}`,
//     source: e.source,
//     target: e.target,
//     type: ConnectionLineType.SmoothStep,
//     animated: !!e.animated,
//   }));
// }

function linksToEdges(deviceLink) {
  return (deviceLink ?? [])
    .filter((e) => e.source && e.target) // 只把有完整端點的拿去渲染
    .map((e) => ({
      id: String(e.id),
      source: e.source,
      target: e.target,
      type: ConnectionLineType.SmoothStep, // 統一用 enum（避免字串 typo）
      animated: true,
    }));
}

/** 依方向（TB/LR）做 dagre 佈局 */
function getLayoutedElements(nodes, edges, direction = 'TB') {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

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

export default function Network() {
  const { deviceData, setDeviceData, deviceLink, setDeviceLink } = useGlobalContext();

  // 以全域資料轉成 RF nodes/edges，並先做一次 TB 佈局
  const { nodes: layoutedNodes0, edges: layoutedEdges0 } = useMemo(() => {
    const n = devicesToNodes(deviceData);
    const e = linksToEdges(deviceLink);
    return getLayoutedElements(n, e, 'TB');
  }, [deviceData, deviceLink]);


  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes0);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges0);

  // 方向（TB / LR）
  const [direction, setDirection] = useState('TB');

  // 當全域資料變動 重新從全域建一次圖並佈局
  useEffect(() => {
    const n = devicesToNodes(deviceData);
    const e = linksToEdges(deviceLink);
    const { nodes: nl, edges: el } = getLayoutedElements(n, e, direction);
    setNodes(nl);
    setEdges(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceData, deviceLink, direction]); 

  // 連線（拖線）
  const onConnect = useCallback(
    (params) => {
      // 先更新畫面上的 edges
      setEdges((eds) =>
        addEdge({ ...params, type: ConnectionLineType.SmoothStep, animated: true }, eds)
      );
      // 同步寫回全域 deviceLink
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

  // 重新佈局
  // const onLayout = useCallback(
  //   (dir) => {
  //     setDirection(dir);
  //     const { nodes: nl, edges: el } = getLayoutedElements(nodes, edges, dir);
  //     setNodes([...nl]);
  //     setEdges([...el]);
  //   },
  //   [nodes, edges]
  // );

  // ===== 新增設備（＋）表單 =====
  // const dialogRef = useRef(null);
  // const [form, setForm] = useState({
  //   id: '',
  //   label: '',
  //   type: 'server',
  //   sourceId: '',
  //   targetId: '',
  // });

  // 自動取得不重複的 ID
  // const genNodeId = useCallback(() => {
  //   let n = (deviceData?.length || 0) + 1;
  //   const setIds = new Set(deviceData.map((d) => d.deviceId));
  //   while (setIds.has(String(n))) n += 1;
  //   return String(n);
  // }, [deviceData]);

  // const openCreateDialog = () => {
  //   const newId = genNodeId();
  //   setForm({
  //     id: genNodeId(),
  //     label: '',
  //     type: 'server',
  //     sourceId: newId,
  //     targetId: '',
  //   });
  //   dialogRef.current?.showModal();
  // };

  // const onChangeField = (e) => {
  //   const { name, value } = e.target;
  //   setForm((f) => {
  //     // 當切到 server：來源固定為新節點 id
  //     if (name === 'type') {
  //       if (value === 'server') {
  //         return { ...f, type: value, sourceId: f.id };
  //       }
  //       // 其他型別保持原樣
  //       return { ...f, type: value };
  //     }
  //     // 當 id 改變且目前是 server：同步更新 sourceId = id
  //     if (name === 'id' && f.type === 'server') {
  //       return { ...f, id: value, sourceId: value };
  //     }
  //     return { ...f, [name]: value };
  //   });
  // };

  // 送出：可新增新節點（寫回 deviceData），以及新增邊（寫回 deviceLink）
  // const onSubmitNew = (e) => {
  //   e.preventDefault();
  //   const { id, label, type, sourceId, targetId } = form;

  //   // 目標：維持「原本操作」→ 畫面上會立刻看到結果，且與全域同步
  //   const exists = deviceData.some((d) => d.deviceId === id);

  //   // 若要新增節點（不存在且你有填 label）
  //   let newDeviceData = deviceData;
  //   if (!exists && label.trim()) {
  //     const newDevice = {
  //       deviceId: id,
  //       deviceName: label,
  //       status: 'online',
  //       type,
  //       longitude: '',
  //       latitude: '',
  //       temperature: null,
  //       humidity: null,
  //       batteryLevel: null,
  //       lastUpdated: new Date().toISOString(),
  //       alerts: [],
  //       data: { label }, // 顯示用；你也可以改成 `[${type}] ${label}`
  //       position: { x: 0, y: 0 },
  //     };
  //     newDeviceData = [...deviceData, newDevice];
  //     setDeviceData(newDeviceData);
  //   }

  //   // 決定是否新增邊
  //   // 若是 server，來源固定為新節點；只有選了 targetId 才加邊
  //   if (type === 'server') {
  //     if (targetId) {
  //       if (targetId === id) {
  //         alert('來源與目的不能相同');
  //         return;
  //       }
  //       const existsNow = (nid) => newDeviceData.some((d) => d.deviceId === nid);
  //       if (!existsNow(id) || !existsNow(targetId)) {
  //         alert('請確認新節點與目的節點都存在（若目的為新節點請先填名稱）。');
  //         return;
  //       }
  //       const newEdge = {
  //         id: `e${id}-${targetId}-${Date.now()}`,
  //         source: id,           // ← server 當來源
  //         target: targetId,
  //         type: 'smoothstep',
  //         animated: true,
  //       };
  //       setDeviceLink((links) => [...links, newEdge]);
  //     }
  //   } else {
  //     // 原本的來源/目的邏輯（兩端皆需填）
  //     if (sourceId && targetId) {
  //       if (sourceId === targetId) {
  //         alert('來源與目的不能相同');
  //         return;
  //       }
  //       const existsNow = (nid) => newDeviceData.some((d) => d.deviceId === nid);
  //       if (!existsNow(sourceId) || !existsNow(targetId)) {
  //         alert('來源或目的節點不存在。若其中一端是「新節點」，請先填入名稱讓節點被新增。');
  //         return;
  //       }
  //       const newEdge = {
  //         id: `e${sourceId}-${targetId}-${Date.now()}`,
  //         source: sourceId,
  //         target: targetId,
  //         type: 'smoothstep',
  //         animated: true,
  //       };
  //       setDeviceLink((links) => [...links, newEdge]);
  //     }
  //   }

  //   // 關閉視窗（畫面會因全域變動而自動重新佈局/同步）
  //   dialogRef.current?.close();
  // };

  // 供下拉顯示（來源/目的）
  const nodeOptions = useMemo(
    () =>
      (deviceData ?? []).map((d) => ({
        id: d.deviceId,
        label: d?.data?.label ?? d.deviceName ?? d.deviceId,
      })),
    [deviceData]
  );

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        nodeTypes={nodeTypes}
      >
        {/* <Panel position="top-right" style={{ display: 'flex', gap: 8 }}>
          <button className="xy-theme__button" onClick={() => onLayout('TB')}>
            vertical layout
          </button>
          <button className="xy-theme__button" onClick={() => onLayout('LR')}>
            horizontal layout
          </button>
          <button
            className="xy-theme__button"
            title="新增設備 / 連線"
            onClick={openCreateDialog}
            style={{ fontWeight: 700 }}
          >
            ＋
          </button>
        </Panel> */}
        {/* <Background /> */}
      </ReactFlow>

      {/* ＋ 表單：可新增節點、也可新增一條 edge（連線來源/目的） */}
      {/* <dialog ref={dialogRef}>
        <form onSubmit={onSubmitNew} style={{ minWidth: 360 }}>
          <h3 style={{ marginTop: 0 }}>新增設備 / 連線</h3>

          <fieldset style={{ marginBottom: 12 }}>
            <legend>新增「新節點」</legend>

            <label style={{ display: 'block', marginBottom: 8 }}>
              新節點 ID
              <input
                name="id"
                value={form.id}
                onChange={onChangeField}
                placeholder="例如：7 或 gw-3"
                style={{ width: '100%' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              設備名稱（label）
              <input
                name="label"
                value={form.label}
                onChange={onChangeField}
                placeholder="例如：Main-Server / GW-A / AMP-01"
                style={{ width: '100%' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              設備類型
              <select name="type" value={form.type} onChange={onChangeField} style={{ width: '100%' }}>
                <option value="server">Server</option>
                <option value="gateway">Gateway</option>
                <option value="transponder">Transponder</option>
                <option value="amp">Amplifier</option>

              </select>
            </label>
          </fieldset>

          <fieldset style={{ marginBottom: 12 }}>
            <legend>新增一條連線</legend>

            <label style={{ display: 'block', marginBottom: 8 }}>
              連線來源
              <select
                name="sourceId"
                value={form.sourceId}
                onChange={onChangeField}
                style={{ width: '100%' }}
                disabled={form.type === 'server'}   // ← 關閉選擇
                title={form.type === 'server' ? 'Server 無上游，來源固定為新節點' : undefined}
              >
                <option value="">不新增邊</option>
                {form.id && (
                  <option value={form.id}>（新節點）{form.id} — {form.label || '(未命名)'}</option>
                )}
                {nodeOptions.map((opt) => (
                  <option key={`s-${opt.id}`} value={opt.id}>
                    {opt.id} — {opt.label}
                  </option>
                ))}
              </select>
              {form.type === 'server' && (
                <small style={{ color: '#666' }}>Server 無上游；若要同時建立連線，請選擇「連線目的」。</small>
              )}
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              連線目的
              <select
                name="targetId"
                value={form.targetId}
                onChange={onChangeField}
                style={{ width: '100%' }}
              >


                {nodeOptions.map((opt) => (
                  <option key={`t-${opt.id}`} value={opt.id}>
                    {opt.id} — {opt.label}
                  </option>
                ))}

                {form.id && (
                  <option value={form.id}>新節點{form.id} — {form.label || '(未命名)'}</option>
                )}
                <option value="">不新增邊</option>
              </select>
            </label>
          </fieldset>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="xy-theme__button" onClick={() => dialogRef.current?.close()}>
              取消
            </button>
            <button type="submit" className="xy-theme__button xy-theme__button--primary">
              確認
            </button>
          </div>
        </form>
      </dialog> */}
    </>
  );
}
