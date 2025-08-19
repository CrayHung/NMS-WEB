import React from 'react';

export default function DeviceList() {
  return (
    <div className="card">
      <h3>設備管理</h3>
      <button>新增設備</button>
      <table>
        <thead>
          <tr>
            <th>名稱</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Camera 1</td>
            <td>正常</td>
            <td><button>編輯</button> <button>刪除</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
