'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _defs = require('./defs');

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class ObfsRandomPaddingPreset extends _defs.IPreset {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._adBuf = null, _temp;
  }

  onInit() {
    this._adBuf = new _utils.AdvancedBuffer({ getPacketLength: this.onReceiving.bind(this) });
    this._adBuf.on('data', this.onChunkReceived.bind(this));
  }

  onDestroy() {
    this._adBuf.clear();
    this._adBuf = null;
  }

  getRandomBytesLength(dataLen) {
    if (dataLen > 1440) {
      return 0;
    }
    const rand = _crypto2.default.randomBytes(1)[0];
    let random_bytes_len;
    if (dataLen > 1300) {
      random_bytes_len = rand % 31;
    } else if (dataLen > 900) {
      random_bytes_len = rand % 127;
    } else if (dataLen > 400) {
      random_bytes_len = rand % 521;
    } else {
      random_bytes_len = rand % 1021;
    }
    return random_bytes_len;
  }

  beforeOut({ buffer }) {
    const chunks = (0, _utils.getRandomChunks)(buffer, 0x3fff, 0xffff).map(data => {
      const pLen = this.getRandomBytesLength(data.length);
      const padding = _crypto2.default.randomBytes(pLen);
      return Buffer.concat([(0, _utils.numberToBuffer)(pLen, 1), padding, (0, _utils.numberToBuffer)(data.length), data]);
    });
    return Buffer.concat(chunks);
  }

  beforeIn({ buffer, next }) {
    this._adBuf.put(buffer, { next });
  }

  onReceiving(buffer) {
    if (buffer.length < 3) {
      return;
    }
    const pLen = buffer[0];
    if (buffer.length < 1 + pLen + 2) {
      return;
    }
    const dLen = buffer.readUInt16BE(1 + pLen);
    if (buffer.length < 1 + pLen + 2 + dLen) {
      return;
    }
    return 1 + pLen + 2 + dLen;
  }

  onChunkReceived(chunk, { next }) {
    const pLen = chunk[0];
    next(chunk.slice(1 + pLen + 2));
  }

  beforeOutUdp({ buffer }) {
    const pLen = _crypto2.default.randomBytes(1)[0] % 128;
    const padding = _crypto2.default.randomBytes(pLen);
    return Buffer.concat([(0, _utils.numberToBuffer)(pLen, 1), padding, buffer]);
  }

  beforeInUdp({ buffer, fail }) {
    if (buffer.length < 1) {
      return fail(`too short to get PaddingLen, len=${buffer.length} dump=${buffer.toString('hex')}`);
    }
    const pLen = buffer[0];
    if (buffer.length < 1 + pLen) {
      return fail(`too short to drop Padding, len=${buffer.length} dump=${buffer.slice(0, 60).toString('hex')}`);
    }
    return buffer.slice(1 + pLen);
  }

}
exports.default = ObfsRandomPaddingPreset;