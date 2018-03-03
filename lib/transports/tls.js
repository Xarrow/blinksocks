'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TlsOutbound = exports.TlsInbound = undefined;

var _tls = require('tls');

var _tls2 = _interopRequireDefault(_tls);

var _tcp = require('./tcp');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class TlsInbound extends _tcp.TcpInbound {

  get name() {
    return 'tls:inbound';
  }

  get bufferSize() {
    return super.bufferSize - 1;
  }

}

exports.TlsInbound = TlsInbound;
class TlsOutbound extends _tcp.TcpOutbound {

  get name() {
    return 'tls:outbound';
  }

  get bufferSize() {
    return super.bufferSize - 1;
  }

  async _connect({ host, port }) {
    _utils.logger.info(`[tls:outbound] [${this.remote}] connecting to tls://${host}:${port}`);
    return _tls2.default.connect({ host, port, ca: [this._config.tls_cert] });
  }

}
exports.TlsOutbound = TlsOutbound;