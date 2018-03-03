'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UdpOutbound = exports.UdpInbound = undefined;

var _dgram = require('dgram');

var _dgram2 = _interopRequireDefault(_dgram);

var _defs = require('./defs');

var _constants = require('../constants');

var _actions = require('../presets/actions');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class UdpInbound extends _defs.Inbound {

  constructor(props) {
    super(props);
    this._socket = null;
    this._rinfo = null;
    this.onReceive = this.onReceive.bind(this);
    this.onPresetFailed = this.onPresetFailed.bind(this);
    this._socket = this.ctx.socket;
  }

  onReceive(buffer, rinfo) {
    const type = this._config.is_client ? _constants.PIPE_ENCODE : _constants.PIPE_DECODE;
    this._rinfo = rinfo;
    this.ctx.pipe.feed(type, buffer);
  }

  onBroadcast(action) {
    switch (action.type) {
      case _actions.PRESET_FAILED:
        this.onPresetFailed(action);
        break;
      default:
        break;
    }
  }

  onPresetFailed(action) {
    const { name, message } = action.payload;
    _utils.logger.error(`[udp:inbound] [${this.remote}] preset "${name}" fail to process: ${message}`);
    if (this._outbound) {
      this._outbound.close();
      this._outbound = null;
    }
    this.close();
    this.broadcast({ type: _actions.CONNECTION_CLOSED, payload: { host: this.remoteHost, port: this.remotePort } });
  }

  write(buffer) {
    const { address, port } = this._rinfo;
    const onSendError = err => {
      if (err) {
        _utils.logger.warn(`[udp:inbound] [${this.remote}]:`, err);
      }
    };
    if (this._config.is_client) {
      const isSs = this.ctx.pipe.presets.some(({ name }) => ['ss-base'].includes(name));
      this._socket.send(buffer, port, address, isSs, onSendError);
    } else {
      this._socket.send(buffer, port, address, onSendError);
    }
  }

  close() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket = null;
      this.emit('close');
    }
  }

}

exports.UdpInbound = UdpInbound;
class UdpOutbound extends _defs.Outbound {

  constructor(props) {
    super(props);
    this._socket = null;
    this._targetHost = null;
    this._targetPort = null;
    this.onReceive = this.onReceive.bind(this);
    this._socket = _dgram2.default.createSocket('udp4');
    this._socket.on('message', this.onReceive);
  }

  onReceive(buffer) {
    const type = this._config.is_client ? _constants.PIPE_DECODE : _constants.PIPE_ENCODE;
    this.ctx.pipe.feed(type, buffer);
  }

  onBroadcast(action) {
    switch (action.type) {
      case _actions.CONNECT_TO_REMOTE:
        if (this._targetHost === null && this._targetPort === null) {
          this.onConnectToRemote(action);
        }
        break;
      default:
        break;
    }
  }

  write(buffer) {
    const host = this._targetHost;
    const port = this._targetPort;
    if (host === null || port === null) {
      _utils.logger.error('[udp:outbound] fail to send udp data, target address was not initialized.');
    } else if (port <= 0 || port >= 65536) {
      _utils.logger.error(`[udp:outbound] fail to send udp data, target port "${port}" is invalid.`);
    } else {
      this._socket.send(buffer, port, host, err => {
        if (err) {
          _utils.logger.warn(`[udp:outbound] [${this.remote}]:`, err);
        }
      });
    }
  }

  onConnectToRemote(action) {
    const { host, port, onConnected } = action.payload;
    if (this._config.is_client) {
      this._targetHost = this._config.server_host;
      this._targetPort = this._config.server_port;
    }
    if (this._config.is_server) {
      this._targetHost = host;
      this._targetPort = port;
      if (typeof onConnected === 'function') {
        onConnected();
      }
    }
    _utils.logger.info(`[udp:outbound] [${this.remote}] request: ${host}:${port}`);
  }

  close() {
    if (this._socket !== null && this._socket._handle !== null) {
      this._socket.close();
      this._socket = null;
      this.emit('close');
    }
  }

}
exports.UdpOutbound = UdpOutbound;