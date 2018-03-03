'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _defs = require('./defs');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function parseFile(file) {
  const txt = _fs2.default.readFileSync(file, { encoding: 'utf-8' });
  const lines = txt.split(/\r\n|\n|\r/);
  const parts = [];
  let part = '';
  for (const line of lines) {
    switch (line[0]) {
      case '=':
      case '-':
        if (part !== '') {
          part += '\r\n';
          parts.push(part);
          part = '';
        }
        break;
      default:
        part += line;
        part += '\r\n';
        break;
    }
  }
  const pairs = [];
  for (let i = 0; i < parts.length; i += 2) {
    const prev = parts[i];
    const next = parts[i + 1];
    pairs.push({
      request: Buffer.from(prev),
      response: Buffer.from(next)
    });
  }
  return pairs;
}

class ObfsHttpPreset extends _defs.IPreset {
  constructor(...args) {
    var _temp;

    return _temp = super(...args), this._isHeaderSent = false, this._isHeaderRecv = false, this._response = null, _temp;
  }

  static onCheckParams({ file }) {
    if (typeof file !== 'string' || file === '') {
      throw Error('\'file\' must be a non-empty string');
    }
  }

  static onCache({ file }) {
    return {
      pairs: parseFile(file)
    };
  }

  onDestroy() {
    this._response = null;
  }

  clientOut({ buffer }) {
    if (!this._isHeaderSent) {
      const { pairs } = this.getStore();
      this._isHeaderSent = true;
      const index = _crypto2.default.randomBytes(1)[0] % pairs.length;
      const { request } = pairs[index];
      return Buffer.concat([request, buffer]);
    } else {
      return buffer;
    }
  }

  serverIn({ buffer, fail }) {
    if (!this._isHeaderRecv) {
      const found = this.getStore().pairs.find(({ request }) => buffer.indexOf(request) === 0);
      if (found !== undefined) {
        this._isHeaderRecv = true;
        this._response = found.response;
        return buffer.slice(found.request.length);
      } else {
        return fail('http header mismatch');
      }
    } else {
      return buffer;
    }
  }

  serverOut({ buffer }) {
    if (!this._isHeaderSent) {
      this._isHeaderSent = true;
      return Buffer.concat([this._response, buffer]);
    } else {
      return buffer;
    }
  }

  clientIn({ buffer, fail }) {
    if (!this._isHeaderRecv) {
      const found = this.getStore().pairs.find(({ response }) => buffer.indexOf(response) === 0);
      if (found !== undefined) {
        this._isHeaderRecv = true;
        return buffer.slice(found.response.length);
      } else {
        return fail('http header mismatch');
      }
    } else {
      return buffer;
    }
  }

}
exports.default = ObfsHttpPreset;