'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _defs = require('./defs');

var _actions = require('./actions');

var _utils = require('../utils');

const CMD_NEW_CONN = 0x00;
const CMD_DATA_FRAME = 0x01;
const CMD_CLOSE_CONN = 0x02;

class MuxPreset extends _defs.IPresetAddressing {
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

  onReceiving(buffer, { fail }) {
    if (buffer.length < 5) {
      return;
    }
    const cmd = buffer[0];
    switch (cmd) {
      case CMD_NEW_CONN:
        if (buffer.length < 8 + buffer[5]) {
          return;
        }
        return 8 + buffer[5];
      case CMD_DATA_FRAME:
        if (buffer.length < 7) {
          return;
        }
        return 7 + buffer.readUInt16BE(5);
      case CMD_CLOSE_CONN:
        return 5;
      default:
        fail(`unknown cmd=${cmd} dump=${(0, _utils.dumpHex)(buffer)}`);
        return -1;
    }
  }

  onChunkReceived(chunk, { broadcast, fail }) {
    const cmd = chunk[0];
    const cid = chunk.slice(1, 5).toString('hex');
    switch (cmd) {
      case CMD_NEW_CONN:
        {
          const hostBuf = chunk.slice(6, -2);
          const host = hostBuf.toString();
          const port = chunk.readUInt16BE(6 + chunk[5]);
          if (!(0, _utils.isValidHostname)(host) || !(0, _utils.isValidPort)(port)) {
            return fail(`invalid host or port, host=${(0, _utils.dumpHex)(hostBuf)} port=${port}`);
          }
          return broadcast({
            type: _actions.MUX_NEW_CONN,
            payload: { cid, host, port }
          });
        }
      case CMD_DATA_FRAME:
        {
          const dataLen = chunk.readUInt16BE(5);
          return broadcast({
            type: _actions.MUX_DATA_FRAME,
            payload: { cid, data: chunk.slice(-dataLen) }
          });
        }
      case CMD_CLOSE_CONN:
        return broadcast({
          type: _actions.MUX_CLOSE_CONN,
          payload: { cid }
        });
    }
  }

  createDataFrames(cid, data) {
    const chunks = (0, _utils.getRandomChunks)(data, 0x0800, 0x3fff).map(chunk => Buffer.concat([(0, _utils.numberToBuffer)(CMD_DATA_FRAME, 1), cid, (0, _utils.numberToBuffer)(chunk.length), chunk]));
    return Buffer.concat(chunks);
  }

  createNewConn(host, port, cid) {
    const _host = Buffer.from(host);
    const _port = (0, _utils.numberToBuffer)(port);
    return Buffer.concat([(0, _utils.numberToBuffer)(CMD_NEW_CONN, 1), cid, (0, _utils.numberToBuffer)(_host.length, 1), _host, _port]);
  }

  createCloseConn(cid) {
    return Buffer.concat([(0, _utils.numberToBuffer)(CMD_CLOSE_CONN, 1), cid]);
  }

  clientOut({ buffer, fail }, { host, port, cid, isClosing }) {
    if (cid !== undefined) {
      const _cid = Buffer.from(cid, 'hex');
      const dataFrames = this.createDataFrames(_cid, buffer);
      if (host && port) {
        return Buffer.concat([this.createNewConn(host, port, _cid), dataFrames]);
      }
      if (isClosing) {
        return this.createCloseConn(_cid);
      }
      return dataFrames;
    } else {
      fail(`cid is not provided, drop buffer=${(0, _utils.dumpHex)(buffer)}`);
    }
  }

  serverOut({ buffer, fail }, { cid, isClosing }) {
    if (cid !== undefined) {
      const _cid = Buffer.from(cid, 'hex');
      if (isClosing) {
        return this.createCloseConn(_cid);
      }
      return this.createDataFrames(_cid, buffer);
    } else {
      fail(`cid is not provided, drop buffer=${(0, _utils.dumpHex)(buffer)}`);
    }
  }

  beforeIn({ buffer, broadcast, fail }) {
    this._adBuf.put(buffer, { broadcast, fail });
  }

}
exports.default = MuxPreset;