// websocket.jsx
import { Client } from '@stomp/stompjs';
// 用瀏覽器版的 build，避免 global 未定義
import SockJS from 'sockjs-client/dist/sockjs.min.js';
// import SockJS from 'sockjs-client'
import { WS_BASE } from '../lib/api';

class WebSocketService {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(onConnectCallback) {
    // 建議填 **完整 URL**，避免在 dev 時打到前端主機


    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (s) => import.meta.env.DEV && console.log('[STOMP]', s),

      onConnect: (frame) => {
        console.log('WebSocket Connected:', frame);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        onConnectCallback && onConnectCallback();
      },

      onStompError: (frame) => {
        console.error('WebSocket Error:', frame.headers?.message, frame.body);
        this.isConnected = false;
      },

      onWebSocketClose: () => {
        console.log('WebSocket Disconnected');
        this.isConnected = false;
        this.handleReconnect();
      },

      onWebSocketError: (ev) => {
        console.error('WebSocket low-level error:', ev);
      },
    });

    this.client.activate();
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        if (!this.isConnected) this.client.activate();
      }, 5000 * this.reconnectAttempts);
    }
  }

  subscribe(topic, callback) {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket is not connected');
      return null;
    }

    const subscription = this.client.subscribe(topic, (message) => {
      let payload = null;
      try {
        const body = typeof message?.body === 'string' ? message.body : '';
        const isJson =
          message?.headers?.['content-type']?.includes('json') ||
          /^[\[{]/.test(body.trim()); // 粗略判斷

        payload = isJson ? JSON.parse(body) : body; // 若不是 JSON，就回傳原字串
      } catch (err) {
        console.warn('Non-JSON message on topic', topic, 'body=', message?.body, err);
        payload = message?.body ?? null;
      }
      callback(payload);
    });

    this.subscriptions.set(topic, subscription);
    return subscription;
  }

  unsubscribe(topic) {
    const sub = this.subscriptions.get(topic);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(topic);
    }
  }

  send(destination, body) {
    if (!this.client || !this.isConnected) {
      console.error('WebSocket is not connected');
      return;
    }
    this.client.publish({ destination, body: JSON.stringify(body ?? {}) });
  }

  disconnect() {
    this.subscriptions.forEach((s) => s.unsubscribe());
    this.subscriptions.clear();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

export default new WebSocketService();
