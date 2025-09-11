// Network.jsx..只做顯示 不在此頁新增node
//React flow 詳細教學
//https://www.youtube.com/watch?v=rk_WSjrmHp8
// Network.jsx
// 只做「視圖切換」：Toplogy / List
import React, { useState } from 'react';
import Topology from './pages/Topology';
import List from './pages/List';
import {apiUrl,apiFetch} from '../../lib/api'

export default function Network() {
  const [tab, setTab] = useState('topology'); // 'topology' | 'list'

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="xy-theme__button"
          onClick={() => setTab('topology')}
          style={{
            fontWeight: 700,
            ...(tab === 'topology' ? { background: '#111', color: '#fff' } : {}),
          }}
        >
          topology
        </button>
        <button
          className="xy-theme__button"
          onClick={() => setTab('list')}
          style={{
            fontWeight: 700,
            ...(tab === 'list' ? { background: '#111', color: '#fff' } : {}),
          }}
        >
          list
        </button>
      </div>

      {/* Content */}
      <div style={{ height: '70vh', minHeight: 420 }}>
        {tab === 'topology' ? <Topology /> : <List />}
      </div>
    </div>
  );
}
