'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ssrAuthChain = require('./ssr-auth-chain');

var _ssrAuthChain2 = _interopRequireDefault(_ssrAuthChain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function bisect_left(array, x, low = 0, high = array.length) {
  let mid;
  while (low < high) {
    mid = low + high >> 1;
    if (array[mid] < x) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

class SsrAuthChainBPreset extends _ssrAuthChain2.default {

  constructor(props) {
    super(props);
    this._data_size_list = [];
    this._data_size_list2 = [];
    this._salt = 'auth_chain_b';
  }

  onDestroy() {
    super.onDestroy();
    this._data_size_list = null;
    this._data_size_list2 = null;
  }

  initDataSizeLists() {
    const rng = (0, _ssrAuthChain.xorshift128plus)();
    rng.init_from_bin(this.readProperty('ss-stream-cipher', 'key'));

    let len = rng.next().mod(8).add(4).toNumber();
    for (let i = 0; i < len; ++i) {
      this._data_size_list.push(rng.next().mod(2340).mod(2040).mod(1440).toNumber());
    }

    len = rng.next().mod(16).add(8).toNumber();
    for (let i = 0; i < len; ++i) {
      this._data_size_list2.push(rng.next().mod(2340).mod(2040).mod(1440).toNumber());
    }
    this._data_size_list.sort((a, b) => a - b);
    this._data_size_list2.sort((a, b) => a - b);
  }

  getRandomBytesLengthForTcp(seed, base, rng) {
    if (this._data_size_list.length < 1 || this._data_size_list2.length < 1) {
      this.initDataSizeLists();
    }
    if (base >= 1440) {
      return 0;
    }
    rng.init_from_bin_datalen(seed, base);

    const list_1 = this._data_size_list;
    const list_2 = this._data_size_list2;
    const overhead = this._overhead;

    let pos = bisect_left(list_1, base + overhead);
    pos = pos + rng.next().mod(list_1.length).toNumber();
    if (pos < list_1.length) {
      return list_1[pos] - base - overhead;
    }

    pos = bisect_left(list_2, base + overhead);
    const final_pos = pos + rng.next().mod(list_2.length).toNumber();
    if (final_pos < list_2.length) {
      return list_2[final_pos] - base - overhead;
    }

    if (final_pos < pos + list_2.length - 1) {
      return 0;
    }

    let random_bytes_len;
    if (base > 1300) {
      random_bytes_len = rng.next().mod(31);
    } else if (base > 900) {
      random_bytes_len = rng.next().mod(127);
    } else if (base > 400) {
      random_bytes_len = rng.next().mod(521);
    } else {
      random_bytes_len = rng.next().mod(1021);
    }
    return random_bytes_len.toNumber();
  }

}
exports.default = SsrAuthChainBPreset;