import WebSocket from 'ws';
import { TcpInbound, TcpOutbound } from './tcp';
import { logger } from '../utils';

function patchWebsocket(ws) {
  ws.write = (buffer) => ws.send(buffer, {
    compress: false,
    mask: false,
    fin: true // send data out immediately
  }, () => this.emit('drain'));
  ws.end = () => ws.close();
  ws.destroy = () => ws.close();
  ws.setTimeout = (/* timeout */) => {
    // TODO: timeout mechanism for websocket.
  };
  ws.on('open', (...args) => ws.emit('connect', ...args));
  return ws;
}

export class WsInbound extends TcpInbound {

  constructor(props) {
    super(props);
    if (this._socket) {
      const socket = this._socket;
      socket.on('message', this.onReceive);
      socket.on('close', () => socket.destroyed = true);
      patchWebsocket.call(this, socket);
    }
  }

  get name() {
    return 'ws:inbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

}

export class WsOutbound extends TcpOutbound {

  get name() {
    return 'ws:outbound';
  }

  get bufferSize() {
    return this._socket ? this._socket.bufferedAmount : 0;
  }

  get writable() {
    return this._socket && this._socket.readyState === WebSocket.OPEN;
  }

  async _connect({ host, port }) {
    logger.info(`[${this.name}] [${this.remote}] connecting to ws://${host}:${port}`);
    const socket = new WebSocket(`ws://${host}:${port}`, { perMessageDeflate: false });
    socket.on('message', this.onReceive);
    socket.on('close', () => socket.destroyed = true);
    return patchWebsocket.call(this, socket);
  }

}
