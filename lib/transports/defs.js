'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Outbound = exports.Inbound = undefined;

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Bound extends _events2.default {

  constructor({ config, context }) {
    super();
    this._ctx = null;
    this._config = null;
    this._config = config;
    this._ctx = context;
  }

  get ctx() {
    return this._ctx;
  }

  get remoteHost() {
    return this.ctx.remoteInfo.host;
  }

  get remotePort() {
    return this.ctx.remoteInfo.port;
  }

  get remote() {
    return `${this.remoteHost}:${this.remotePort}`;
  }

  get bufferSize() {
    return 0;
  }

  get writable() {
    return true;
  }

  onBroadcast() {}

  write(buffer) {}

  end() {}

  close() {}

  updatePresets(value) {
    this.emit('updatePresets', value);
  }

  broadcast(action) {
    !this.ctx.pipe.destroyed && this.ctx.pipe.broadcast('pipe', action);
  }

}

class Inbound extends Bound {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._outbound = null, _temp;
  }

  setOutbound(outbound) {
    this._outbound = outbound;
  }

  getOutbound() {
    return this._outbound;
  }

}

exports.Inbound = Inbound;
class Outbound extends Bound {
  constructor(...args) {
    var _temp2;

    return _temp2 = super(...args), this._inbound = null, _temp2;
  }

  setInbound(inbound) {
    this._inbound = inbound;
  }

  getInbound() {
    return this._inbound;
  }

}
exports.Outbound = Outbound;