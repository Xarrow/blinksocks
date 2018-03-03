'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ssrAuthAes = require('./ssr-auth-aes128');

var _ssrAuthAes2 = _interopRequireDefault(_ssrAuthAes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SsrAuthAes128Sha1Preset extends _ssrAuthAes2.default {

  constructor(props) {
    super(props);
    this._hashFunc = 'sha1';
    this._salt = 'auth_aes128_sha1';
  }

}
exports.default = SsrAuthAes128Sha1Preset;