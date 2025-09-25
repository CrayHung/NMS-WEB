// src/components/Service/pages/Notification.jsx
import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Card, Alert, Badge, Button, Table, Row, Col, Form } from 'react-bootstrap';
import { FiBell, FiAlertTriangle, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

import wsService from '../../../service/websocket'; // 只用來讀取連線狀態
import { useGlobalContext } from '../../../GlobalContext';
import { formatDateTime, getTimeDifference } from '../../../utils/formatters';
import { apiUrl,tgUrl } from '../../../lib/api';

// const TELEGRAM_API = 'http://61.216.140.11:9081/api/alerts/send';
const TELEGRAM_API = tgUrl('/api/alerts/send');
const TELEGRAM_API_KEY = 'alert-key'; // header: X-API-KEY

// level: 2=Critical, 1=Warning, 0/其他=Info
const levelToType = (level) => (level >= 2 ? 'CRITICAL' : level >= 1 ? 'WARNING' : 'INFO');

const Notification = () => {
  // ✅ 使用全域 alerts 與動作（與 Header 同步）
  const {
    alerts,                   // 全域告警清單（由 Header/Provider 寫入）
    acknowledgeAlert,         // 單筆 ack
    clearAcknowledgedAlerts,  // 清除已讀
    clearAllAlerts,           // 全清
  } = useGlobalContext();

  const [recentAlarms, setRecentAlarms] = useState([]);    // 有活動告警的裝置（統計用）
  const [connected, setConnected] = useState(false);       // WebSocket 連線狀態顯示
  const [filterLevel, setFilterLevel] = useState('all');   // 篩選顯示
  const [audioEnabled, setAudioEnabled] = useState(false); // 保留音效開關 UI

  // --- Telegram 去重：避免同一筆重送 ---
  const sentIdsRef = useRef(new Set());           // 以 alert.id 去重（共用 alerts 的 id）
  const lastSentKeyRef = useRef(new Map());       // 以 `${eui}|${msg}|${level}` 去重（30 秒）

  // 首次掛載時，避免把既有 alerts 全部重送，先標記已存在的 id
  useEffect(() => {
    alerts.forEach((a) => sentIdsRef.current.add(a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 監聽 alerts，若有新進（id 未發送過）就送 Telegram，並做節流去重
  useEffect(() => {
    const newlyArrived = alerts.filter((a) => !sentIdsRef.current.has(a.id));
    if (newlyArrived.length === 0) return;

    newlyArrived.forEach((alarm) => {
      sentIdsRef.current.add(alarm.id);

      //這邊先註解掉...不然太多告警
      // sendTelegramAlert(alarm);

      // 如果要播音，可在這裡加：
      // if (audioEnabled && alarm.level >= 2) playAlarmSound();
    });
  }, [alerts, audioEnabled]);

  // ---- 載入「有活動告警的裝置」清單 ----
  useEffect(() => {
    (async () => {
      try {
        // const url = 'http://61.216.140.11:9002/api/amplifier/statistics';
        const url = apiUrl("/amplifier/statistics");
        const res = await fetch(url, { method: 'GET' });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`GET /statistics failed (${res.status}): ${t || res.statusText}`);
        }
        const stats = await res.json();
        setRecentAlarms(Array.isArray(stats?.recentAlarms) ? stats.recentAlarms : []);
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    })();
  }, []);

  // ---- 輕量查詢 WebSocket 連線狀態（避免在此重複訂閱）----
  useEffect(() => {
    const readStatus = () => setConnected(wsService.getConnectionStatus?.() ?? false);
    readStatus();
    const t = setInterval(readStatus, 5000);
    return () => clearInterval(t);
  }, []);

  // ---- Telegram 發送（帶 30 秒節流 + 關鍵字去重）----
  const sendTelegramAlert = async (alarm) => {
    try {
      const key = `${alarm.deviceEui || ''}|${alarm.message || ''}|${alarm.level}`;
      const now = Date.now();
      const last = lastSentKeyRef.current.get(key) || 0;
      if (now - last < 30_000) {
        // 30 秒內相同關鍵不重送，避免洗版（可自行調整或移除）
        return;
      }
      lastSentKeyRef.current.set(key, now);

      const payload = {
        type: levelToType(alarm.level),                    // CRITICAL / WARNING / INFO
        title: `Alarm - ${alarm.deviceName || alarm.deviceEui || 'Unknown'}`,
        service: 'edge-device',
        link: 'https://twowayiot.com:9081',
        silent: false,
        message: [
          {
            deviceId: alarm.deviceEui ?? '',
            status: 'active',                              // 收到告警，視為 active
            alerts: [
              {
                type: alarm.alarmType || levelToType(alarm.level),
                message: alarm.message || 'Alarm',
                // timestamp: new Date(alarm.timestamp || Date.now()).toISOString(),
                timestamp: new Date(alarm.timestamp || Date.now()).toLocaleString("en-US"),
              },
            ],
          },
        ],
      };

      const res = await fetch(TELEGRAM_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': TELEGRAM_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} - ${text || res.statusText}`);
      }
      // const data = await res.json(); // 若需要可讀取
    } catch (err) {
      console.error('sendTelegramAlert failed:', err);
    }
  };

  // ---- UI 輔助：Icon / Badge ----
  const getAlarmIcon = (level) => {
    switch (level) {
      case 2: return <FiAlertTriangle className="text-danger" />;
      case 1: return <FiAlertCircle className="text-warning" />;
      default: return <FiBell className="text-info" />;
    }
  };
  const getAlarmLevelBadge = (level) => {
    switch (level) {
      case 2: return <Badge bg="danger">Critical</Badge>;
      case 1: return <Badge bg="warning">Warning</Badge>;
      default: return <Badge bg="info">Info</Badge>;
    }
  };

  // ---- 篩選清單（依等級）----
  const filteredAlarms =
    filterLevel === 'all'
      ? alerts
      : alerts.filter((a) => a.level === parseInt(filterLevel, 10));

  return (
    <div>
      {/* 控制列 */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <h5 className="mb-0">
                <FiBell className="me-2" />
                Real-time Alarm Monitoring
              </h5>
            </Col>
            <Col md={8}>
              <div className="d-flex justify-content-end align-items-center gap-3">
                {/* 連線狀態 */}
                <div>
                  <Badge bg={connected ? 'success' : 'danger'}>
                    {connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>

                {/* 告警數（共用） */}
                <div>
                  <span className="text-muted">Total Alarms:</span>
                  <Badge bg="secondary" className="ms-1">
                    {alerts.length}
                  </Badge>
                </div>

                {/* 音效開關（僅 UI） */}
                {/* <Form.Check
                  type="switch"
                  id="audio-switch"
                  label="Audio Alert"
                  checked={audioEnabled}
                  onChange={(e) => setAudioEnabled(e.target.checked)}
                /> */}

                {/* 等級篩選 */}
                <Form.Select
                  size="sm"
                  style={{ width: 130 }}
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <option value="all">All Levels</option>
                  <option value="2">Critical Only</option>
                  <option value="1">Warning Only</option>
                </Form.Select>

                {/* 操作按鈕（共用狀態） */}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={clearAcknowledgedAlerts}
                  disabled={!alerts.some((a) => a.acknowledged)}
                >
                  Clear Acknowledged
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={clearAllAlerts}
                  disabled={alerts.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 最新告警提示（顯示第一筆未讀） */}
      {filteredAlarms.length > 0 &&
        filteredAlarms[0] &&
        !filteredAlarms[0].acknowledged && (
          <Alert
            variant={filteredAlarms[0].level >= 2 ? 'danger' : 'warning'}
            dismissible
            onClose={() => acknowledgeAlert(filteredAlarms[0].id)}
          >
            <Alert.Heading>
              {getAlarmIcon(filteredAlarms[0].level)} Latest Alarm
            </Alert.Heading>
            <p className="mb-0">
              <strong>Device: </strong>
              {filteredAlarms[0].deviceName} |{' '}
              <strong>Message: </strong>
              {filteredAlarms[0].message} |{' '}
              <strong>Time: </strong>
              {formatDateTime(filteredAlarms[0].timestamp)}
            </p>
          </Alert>
        )}

      {/* 告警清單（共用 alerts） */}
      <Card>
        <Card.Body>
          <h5>Alarm Log</h5>

          {filteredAlarms.length === 0 ? (
            <div className="text-center text-muted py-5">
              <FiCheckCircle size={48} className="mb-3" />
              <p>
                Currently no{' '}
                {filterLevel !== 'all' ? 'alarms matching the filter' : 'alarms'}
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredAlarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`alarm-card level-${alarm.level} ${
                    alarm.acknowledged ? 'opacity-50' : ''
                  }`}
                >
                  <Row>
                    <Col md={1} className="text-center">
                      {getAlarmIcon(alarm.level)}
                    </Col>
                    <Col md={2}>
                      <strong>{alarm.deviceName}</strong>
                      <br />
                      <small className="text-muted">{alarm.deviceEui}</small>
                    </Col>
                    <Col md={5}>{alarm.message}</Col>
                    <Col md={2}>
                      {getAlarmLevelBadge(alarm.level)}
                      {alarm.acknowledged && (
                        <Badge bg="secondary" className="ms-1">
                          Acknowledged
                        </Badge>
                      )}
                    </Col>
                    <Col md={2} className="text-end">
                      <small>{formatDateTime(alarm.timestamp)}</small>
                      <br />
                      <small className="text-muted">
                        {getTimeDifference(alarm.timestamp)}
                      </small>
                      {!alarm.acknowledged && (
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 ms-2"
                          onClick={() => acknowledgeAlert(alarm.id)} // ⬅️ 共用
                        >
                          Acknowledge
                        </Button>
                      )}
                    </Col>
                  </Row>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* 有活動告警的裝置（僅展示統計，不寫入 alerts 以免重複） */}
      {recentAlarms.length > 0 && (
        <Card className="mt-3">
          <Card.Body>
            <h5>Devices with Active Alarms</h5>
            <Table hover responsive size="sm">
              <thead>
                <tr>
                  <th>Device EUI</th>
                  <th>Device Name</th>
                  <th>Temp. Alarm</th>
                  <th>Volt. Alarm</th>
                  <th>Ripple Alarm</th>
                  <th>Power Alarm</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentAlarms.map((device) => (
                  <tr key={device.deviceEui}>
                    <td><code>{device.deviceEui}</code></td>
                    <td>{device.partName || '-'}</td>
                    <td className={device.tempAlarmStatus > 0 ? 'text-danger' : 'text-success'}>
                      {device.tempAlarmStatus > 0 ? 'Abnormal' : 'Normal'}
                    </td>
                    <td className={device.voltAlarmStatus > 0 ? 'text-danger' : 'text-success'}>
                      {device.voltAlarmStatus > 0 ? 'Abnormal' : 'Normal'}
                    </td>
                    <td className={device.rippleAlarmStatus > 0 ? 'text-danger' : 'text-success'}>
                      {device.rippleAlarmStatus > 0 ? 'Abnormal' : 'Normal'}
                    </td>
                    <td className={device.tcpAlarmStatus > 0 ? 'text-danger' : 'text-success'}>
                      {device.tcpAlarmStatus > 0 ? 'Abnormal' : 'Normal'}
                    </td>
                    <td>{getTimeDifference(device.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default Notification;
