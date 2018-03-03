"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class IPreset {
  static onCheckParams(params) {}

  static onCache(params, store) {}

  constructor({ config, params } = {}) {
    this._config = null;

    if (config) {
      this._config = config;
    }
  }

  onInit(params) {}

  onNotified(action) {
    return false;
  }

  onDestroy() {}

  beforeOut({ buffer }) {
    return buffer;
  }

  beforeIn({ buffer }) {
    return buffer;
  }

  clientOut({ buffer }) {
    return buffer;
  }

  serverIn({ buffer }) {
    return buffer;
  }

  serverOut({ buffer }) {
    return buffer;
  }

  clientIn({ buffer }) {
    return buffer;
  }

  beforeOutUdp({ buffer }) {
    return buffer;
  }

  beforeInUdp({ buffer }) {
    return buffer;
  }

  clientOutUdp({ buffer }) {
    return buffer;
  }

  serverInUdp({ buffer }) {
    return buffer;
  }

  serverOutUdp({ buffer }) {
    return buffer;
  }

  clientInUdp({ buffer }) {
    return buffer;
  }

  next(direction, buffer) {}

  broadcast(action) {}

  fail(message) {}

  readProperty(presetName, propertyName) {}

  getStore() {}

}

exports.IPreset = IPreset;
class IPresetAddressing extends IPreset {}
exports.IPresetAddressing = IPresetAddressing;