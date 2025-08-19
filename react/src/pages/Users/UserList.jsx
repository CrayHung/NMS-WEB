import React from 'react';

export default function UserList() {
  return (
    <div className="card">
      <h3>使用者權限管理</h3>
      <button>新增使用者</button>
      <table>
        <thead>
          <tr>
            <th>名稱</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>管理員</td>
            <td>Admin</td>
            <td><button>編輯</button> <button>刪除</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
