'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _defs = require('./defs');

var _actions = require('./actions');

var _utils = require('../utils');

var _constants = require('../constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const MAX_TIME_DIFF = 30;
const NOOP = Buffer.alloc(0);

class AutoConfPreset extends _defs.IPreset {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._isSuiteChanged = false, this._isHeaderSent = false, this._header = null, _temp;
  }

  static onCheckParams({ suites }) {
    if (typeof suites !== 'string' || suites.length < 1) {
      throw Error('\'suites\' is invalid');
    }
  }

  static async onCache({ suites: uri }) {
    _utils.logger.info(`[auto-conf] loading suites from: ${uri}`);
    let suites = [];
    if (uri.startsWith('http')) {
      const res = await (0, _nodeFetch2.default)(uri);
      suites = await res.json();
    } else {
      const suiteJson = _path2.default.resolve(process.cwd(), uri);
      const rawText = _fs2.default.readFileSync(suiteJson, { encoding: 'utf-8' });
      suites = JSON.parse(rawText);
    }
    if (suites.length < 1) {
      throw Error(`you must provide at least one suite in ${uri}`);
    }
    _utils.logger.info(`[auto-conf] ${suites.length} suites loaded`);
    return { suites };
  }

  onDestroy() {
    this._header = null;
  }

  createRequestHeader(suites) {
    const sid = _crypto2.default.randomBytes(2);
    const utc = (0, _utils.numberToBuffer)((0, _utils.getCurrentTimestampInt)(), 4, _utils.BYTE_ORDER_LE);
    const key = (0, _utils.EVP_BytesToKey)(Buffer.from(this._config.key).toString('base64') + (0, _utils.hash)('md5', sid).toString('base64'), 16, 16);
    const cipher = _crypto2.default.createCipheriv('rc4', key, NOOP);
    const enc_utc = cipher.update(utc);
    const request_hmac = (0, _utils.hmac)('md5', key, Buffer.concat([sid, enc_utc]));
    return {
      header: Buffer.concat([sid, enc_utc, request_hmac]),
      suite: suites[sid.readUInt16LE(0) % suites.length]
    };
  }

  encodeChangeSuite({ buffer, broadcast, fail }) {
    const { suites } = this.getStore();
    if (suites.length < 1) {
      return fail('suites are not initialized properly');
    }
    const { header, suite } = this.createRequestHeader(suites);
    this._header = header;
    this._isSuiteChanged = true;
    return broadcast({
      type: _actions.CHANGE_PRESET_SUITE,
      payload: {
        type: _constants.PIPE_ENCODE,
        suite: suite,
        data: buffer
      }
    });
  }

  decodeChangeSuite({ buffer, broadcast, fail }) {
    const { suites } = this.getStore();
    if (suites.length < 1) {
      return fail('suites are not initialized properly');
    }
    if (buffer.length < 22) {
      return fail(`client request is too short, dump=${(0, _utils.dumpHex)(buffer)}`);
    }
    const sid = buffer.slice(0, 2);
    const request_hmac = buffer.slice(6, 22);
    const key = (0, _utils.EVP_BytesToKey)(Buffer.from(this._config.key).toString('base64') + (0, _utils.hash)('md5', sid).toString('base64'), 16, 16);
    const hmac_calc = (0, _utils.hmac)('md5', key, buffer.slice(0, 6));
    if (!hmac_calc.equals(request_hmac)) {
      return fail(`unexpected hmac of client request, dump=${(0, _utils.dumpHex)(buffer)}`);
    }
    const enc_utc = buffer.slice(2, 6);
    const decipher = _crypto2.default.createDecipheriv('rc4', key, NOOP);
    const utc = decipher.update(enc_utc).readUInt32LE(0);
    const time_diff = Math.abs(utc - (0, _utils.getCurrentTimestampInt)());
    if (time_diff > MAX_TIME_DIFF) {
      return fail(`timestamp diff is over ${MAX_TIME_DIFF}s, dump=${(0, _utils.dumpHex)(buffer)}`);
    }
    const suite = suites[sid.readUInt16LE(0) % suites.length];
    this._isSuiteChanged = true;
    return broadcast({
      type: _actions.CHANGE_PRESET_SUITE,
      payload: {
        type: _constants.PIPE_DECODE,
        suite: suite,
        data: buffer.slice(22)
      }
    });
  }

  clientOut({ buffer, broadcast, fail }) {
    if (!this._isSuiteChanged) {
      return this.encodeChangeSuite({ buffer, broadcast, fail });
    }
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this._header, buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({ buffer, broadcast, fail }) {
    if (!this._isSuiteChanged) {
      return this.decodeChangeSuite({ buffer, broadcast, fail });
    } else {
      return buffer;
    }
  }

  clientOutUdp({ buffer, broadcast, fail }) {
    if (!this._isSuiteChanged) {
      return this.encodeChangeSuite({ buffer, broadcast, fail });
    } else {
      this._isSuiteChanged = false;
      return Buffer.concat([this._header, buffer]);
    }
  }

  serverInUdp({ buffer, broadcast, fail }) {
    if (!this._isSuiteChanged) {
      return this.decodeChangeSuite({ buffer, broadcast, fail });
    } else {
      this._isSuiteChanged = false;
      return buffer;
    }
  }

}
exports.default = AutoConfPreset;