/* jshint node: true */
'use strict';

var _ = require('busyman'),
    Concentrate = require('concentrate'),
    DChunks = require('dissolve-chunks'),
    ru = DChunks().Rule(),
    bipso = require('bipso');

var charMeta = require('./defs/charMeta');

var nibbleBuf = [];

/*************************************************************************************************/
/*** BleObject Class                                                                         ***/
/***   1. Provides command framer                                                              ***/
/***   2. Provides parser                                                                      ***/
/*************************************************************************************************/
function BleObject(uuid) {
    if (typeof uuid === 'number')
        uuid = '0x' + uuid.toString(16);

    this.uuid = uuid;
    this.isBipso = bipso.uo(uuid) ? true : false;
    this.meta = this.isBipso ? null : charMeta[uuid];
}

BleObject.prototype.frame = function (valObj) {
    var self = this,
        meta = this.meta,
        args = [],
        dataBuf = Concentrate(),
        extJudge;

    // BIPSO-defined Characteristic
    if (this.isBipso) 
        return bipso.frame(this.uuid, valObj);

    // GATT-defined Characteristic
    _.forEach(meta.params, function (param, i) {
        if (!_.has(valObj, param)) 
            throw new Error('The argument object has incorrect properties.');

        args.push({ param: param, type: meta.types[i], value: valObj[param] });
    });

    nibbleBuf = [];

    if (this.meta.extra) {
        if (_.has(valObj, 'flags')) {
            extJudge = function (i) { 
                return ((valObj.flags & meta.extra.flags[i]) === meta.extra.result[i]); 
            };
        } else if (_.has(valObj, 'condition')) {
            // handle 0x290a, 0x290e
            extJudge = function (i) { 
                if (self.UUID === '0x290a' && valObj.condition === 0) 
                    return false;
                else 
                    return (valObj.condition <= meta.extra.result[i]);
            };
        } else if (_.has(valObj, 'opcode')) {
            // TODO handle variable
            extJudge = function (i) { 
                return (valObj.opcode === meta.extra.result[i]); 
            };
        }

        _.forEach(meta.extra.params, function (extParam, i) {
            if (extJudge(i)) {
                if (!_.has(valObj, extParam))
                    throw new Error('The argument object has incorrect properties.');

                args.push({ param: extParam, type: meta.extra.types[i], value: valObj[extParam] });

                if (_.has(valObj, 'condition')) 
                    return false;
            }
        });
    }

    _.forEach(args, function (arg) {
        builder(dataBuf, arg.value, arg.type, meta);
    });

    return dataBuf.result();
};

BleObject.prototype.parse = function (buf, callback) {
    var self = this,
        meta = this.meta,
        chunkRules = [],
        parser,
        bufLen;

    // BIPSO-defined Characteristic
    if (this.isBipso) 
        return bipso.parse(this.uuid, buf, function (err, result) {
            callback(err, result);
        });

    // GATT-defined Characteristic
    bufLen = meta.bufLen;

    if (bufLen && (buf.length !== bufLen) && (_.isArray(bufLen) && !_.includes(bufLen, buf.length))) {
        process.nextTick(function () {
            callback(null, buf);
        });
    } else {
        _.forEach(meta.params, function (param, idx) {
            var valType = meta.types[idx];

            if ( valType === 'string' ) {
                if (buf[buf.length - 1] === 0) 
                    buf = buf.slice(0, buf.length - 1);

                if (self.uuid === '0x2a46') 
                    chunkRules.push(ru.string(param, buf.length - 2));
                else 
                    chunkRules.push(ru.string(param, buf.length));
            } else if (_.startsWith(valType, 'addr')) {
                chunkRules.push(ru.charAddr(param, _.parseInt(valType.slice(4))));
            } else if ( valType === 'nibble') {
                nibbleBuf.push(param);
                if (nibbleBuf.length === 2) {
                    chunkRules.push(ru[valType](nibbleBuf[0], nibbleBuf[1]));
                }
            } else if ( valType === 'uuid' ) {
                if (self.uuid === '0x2802') 
                    chunkRules.push(ru.uuid(param, buf.length - 4));
                else if (self.uuid === '0x2803' || self.uuid === '0x7890') 
                    chunkRules.push(ru.uuid(param, buf.length - 3));
                else if (self.uuid === '0x2a7d') 
                    chunkRules.push(ru.uuid(param, buf.length - 2));
                else 
                    chunkRules.push(ru.uuid(param, buf.length));
            } else if ( valType === 'list' ) {
                chunkRules.push(ru.list(param, meta.objInfo, buf.length));
            } else if (valType === 'buffer') {
                chunkRules.push(ru[valType](param, buf.length - meta.preBufLen));
            } else {
                chunkRules.push(ru[valType](param));
            }
        });

        nibbleBuf = [];

        if (meta.extra) {
            chunkRules.push(buildExtraRule(this.uuid, meta.extra));
        }

        if (chunkRules.length === 0) {
            process.nextTick(function () {
                callback(null, {});
            });

            return;
        }

        parser = DChunks().join(chunkRules).compile();
        parser.on('parsed', function (result) {
            parser = undefined;
            callback(null, result);
        });
        parser.end(buf);
    }
};


/*************************************************************************************************/
/*** Specific Chunk Rules                                                                      ***/
/*************************************************************************************************/
ru.clause('boolean', function (name) {
    this.uint8('bool').tap(function () {
        if (!this.vars.bool) this.vars[name] = false;
        else this.vars[name] = true; 
        delete this.vars.bool;
    });   
});

ru.clause('uint24', function (name) {
    this.uint8('lsb').tap(function () {
        this.uint16('msb').tap(function () {
            var value;
            value = (this.vars.msb * 256) + this.vars.lsb;
            this.vars[name] = value;
            delete this.vars.lsb;
            delete this.vars.msb;
        });
    });  
});     

ru.clause('int24', function (name) {
    this.uint8('lsb').tap(function () {
        this.uint16('msb').tap(function () {
            var value,
                sign = (this.vars.msb & 0x8000) >> 15;
            value = ((this.vars.msb & 0x7FFF) * 256) + this.vars.lsb;
            if (sign) this.vars[name] = -(0x7FFFFF - value + 1);
            else this.vars[name] = value;
            delete this.vars.lsb;
            delete this.vars.msb;
        });
    });  
});     

ru.clause('charAddr', function (name, valLen) {
    this.buffer(name, valLen).tap(function () {
        var addr,
            origBuf = this.vars[name];

        addr = buf2Str(origBuf);
        this.vars[name] = addr;
    });
});

ru.clause('uuid', function (name, bufLen) {
    bufLen = bufLen || 2;

    this.buffer(name, bufLen).tap(function () {
        var uuid,
            origBuf = this.vars[name];

        uuid = buf2Str(origBuf);
        this.vars[name] = uuid;
    });
});

ru.clause('sfloat', function (valName) {
    this.uint16('sfloat').tap(function () {
        this.vars[valName] = uint2sfloat(this.vars.sfloat);
        delete this.vars.sfloat;
    });
});

ru.clause('float', function (valName) {
    this.uint32('float').tap(function () {
        this.vars[valName] = uint2float(this.vars.float);
        delete this.vars.float;
    });
});

ru.clause('nibble', function (valLsbName, valMsbName) {
    this.uint8('temp').tap(function () {
        this.vars[valLsbName] = this.vars.temp & 0x0F;
        this.vars[valMsbName] = (this.vars.temp & 0xF0)/16;
        delete this.vars.temp;
    });
});

ru.clause('list', function (objName, objAttrs, buflen) {
    var loopTimes = Math.floor(buflen / objAttrs.objLen),
        i = 0;

    this.loop(objName, function (end) {
        i += 1;
        this[objAttrs.types[0]]();

        if (i === loopTimes) end();
    }).tap(function () {
        var tempArr = [];
        _.forEach(this.vars[objName], function (obj) {
            tempArr.push(obj.undefined);
        });
        this.vars[objName] = tempArr;
    });
});

ru.clause('0x290a', function (extParams, extTypes) {
    this.tap(function () {
        if ((this.vars.condition > 0) && (this.vars.condition <= 3)) {
            this[extTypes[0]](extParams[0]);
        } else if (this.vars.condition === 4) {
            this[extTypes[1]](extParams[1]);
        } else if ((this.vars.condition > 4) && (this.vars.condition <= 6)) {
            this[extTypes[2]](extParams[2]);
        }
    });
});

ru.clause('0x290e', function (extParams, extTypes) {
    this.tap(function () {
        if (this.vars.condition === 0) {
            this[extTypes[0]](extParams[0]);
        } else if ((this.vars.condition > 0) && (this.vars.condition <= 2)) {
            ru[extTypes[1]](extParams[1])(this);
        } else if (this.vars.condition === 3) {
            this[extTypes[2]](extParams[2]);
        }
    });
});

var uintRules = [
  'int8', 'sint8', 'uint8',
  'int16', 'int16le', 'int16be', 'sint16', 'sint16le', 'sint16be', 'uint16', 'uint16le', 'uint16be',
  'int32', 'int32le', 'int32be', 'sint32', 'sint32le', 'sint32be', 'uint32', 'uint32le', 'uint32be',
  'int64', 'int64le', 'int64be', 'sint64', 'sint64le', 'sint64be', 'uint64', 'uint64le', 'uint64be',
  'floatbe', 'floatle', 'doublebe', 'doublele'
];

ru.clause('valsRules', function (extParams, extTypes, extFlags, extResult, extValLen) {
    this.tap(function () {
        for (var i = 0; i < extValLen; i++) {
            if ((this.vars.flags & extFlags[i]) === extResult[i]) {
                if(_.indexOf(uintRules, extTypes[i]) > 0) {
                    this[extTypes[i]](extParams[i]);
                } else if (extTypes[i] === 'nibble') {
                    ru.nibble(extParams[i], extParams[i + 1])(this);
                    i += 1; 
                }else {
                    ru[extTypes[i]](extParams[i])(this);
                }
            }   
        }
    });
});

ru.clause('variable', function (extParams, extTypes, extResult, extValLen) {
    this.tap(function () {
        var offest = 0;
        for (var i = 0; i < extValLen; i++) {
            if (this.vars.opcode === extResult[i]) {
                    if (extTypes[i] === 'string') {
                        ru.string(extParams[i], this._buffer.length - 1 - offest)(this);
                    } else {
                        ru[extTypes[i]](extParams[i])(this);
                    }

                    switch (extTypes[i]) {
                        case 'uint8':
                            offest += 1;
                            break;

                        default:
                            break;
                    }
            }   
        }
    });
});


/*************************************************************************************************/
/*** Private Functions                                                                         ***/
/*************************************************************************************************/
function builder(dataBuf, val, type, mata) {
    var tmpBuf,
        result,
        sgn,
        mantissa,
        exponent,
        smantissa,
        rmantissa,
        mdiff,
        int_mantissa;

    switch (type) {
        case 'int8' :
        case 'int16' :
        case 'int32' :
        case 'uint8':
        case 'uint16':
        case 'uint32':
        case 'floatle':
            dataBuf = dataBuf[type](val);
            break;
        case 'uint24':
            tmpBuf = val & 0xFFFF; 
            dataBuf = dataBuf.uint16(tmpBuf);
            tmpBuf = val >> 16;
            dataBuf = dataBuf.uint8(tmpBuf);
            break;
        case 'int24':
            tmpBuf = val & 0xFFFF; 
            dataBuf = dataBuf.uint16(tmpBuf);
            tmpBuf = val >> 16 & 0xFF;
            dataBuf = dataBuf.uint8(tmpBuf);
            break;
        case 'string':
            dataBuf = dataBuf.string(val, "utf8");
            break;
        case 'uuid':
        case 'addr3':
        case 'addr5':
        case 'addr6':
            val = str2Buf(val);
            dataBuf = dataBuf.buffer(val);
            break;
        case 'boolean':
            dataBuf = dataBuf.uint8(val);
            break;
        case 'stringPreLenUint8':
            dataBuf = dataBuf.uint8(val.length).string(val, 'utf8');
            break;
        case 'bufferPreLenUint8':
            dataBuf = dataBuf.uint8(val.length).buffer(val);
            break;
        case 'list':
            dataBuf = generateListBuf(dataBuf, val, mata.objInfo);
            break;
        case 'nibble': 
            nibbleBuf.push(val);
            if (nibbleBuf.length === 2) {
                dataBuf = dataBuf.uint8(nibbleBuf[0] + (nibbleBuf[1] << 4));
                nibbleBuf = [];
            }
            break;
        case 'sfloat':
            result = 0x07FF;
            sgn = val > 0 ? +1 : -1;
            mantissa = Math.abs(val);
            exponent = 0;

            if (isNaN(val)) {
                dataBuf = dataBuf.uint16(result);
                break;
            } else if (val > 20450000000.0) {
                result = 0x07FE;
                dataBuf = dataBuf.uint16(result);
                break;
            } else if (val < -20450000000.0) {
                result = 0x0802;
                dataBuf = dataBuf.uint16(result);
                break;
            } else if (val >= -1e-8 && val <= 1e-8) {
                result = 0;
                dataBuf = dataBuf.uint16(result);
                break;
            }

            // scale up if number is too big
            while (mantissa > 0x07FD) {
                mantissa /= 10.0;
                ++exponent;
                if (exponent > 7) {
                    // argh, should not happen
                    if (sgn > 0) {
                        result = 0x07FE;
                    } else {
                        result = 0x0802;
                    }
                    dataBuf = dataBuf.uint16(result);
                    break;
                }
            }

            // scale down if number is too small
            while (mantissa < 1) {
                mantissa *= 10;
                --exponent;
                if (exponent < -8) {
                    // argh, should not happen
                    result = 0;
                    dataBuf = dataBuf.uint16(result);
                    break;
                }
            }

            smantissa = Math.round(mantissa * 10000);
            rmantissa = Math.round(mantissa) * 10000;
            mdiff = Math.abs(smantissa - rmantissa);

            while (mdiff > 0.5 && exponent > -8 && (mantissa * 10) <= 0x07FD) {
                mantissa *= 10;
                --exponent;
                smantissa = Math.round(mantissa * 10000);
                rmantissa = Math.round(mantissa) * 10000;
                mdiff = Math.abs(smantissa - rmantissa);
            }
            int_mantissa = parseInt(Math.round(sgn * mantissa));
            result = ((exponent & 0xF) << 12) | (int_mantissa & 0xFFF);
            dataBuf = dataBuf.uint16(result);
            break;
        case 'float':
            result = 0x007FFFFF;
            sgn = val > 0 ? +1 : -1;
            mantissa = Math.abs(val);
            exponent = 0;

            if (isNaN(val)) {
                dataBuf = dataBuf.uint32(result);
                break;
            } else if (val > 8.388604999999999e+133) {
                result = 0x007FFFFE;
                dataBuf = dataBuf.uint32(result);
                break;
            } else if (val < -(8.388604999999999e+133)) {
                result = 0x00800002;
                dataBuf = dataBuf.uint32(result);
                break;
            } else if (val >= -(1e-128) && val <= 1e-128) {
                result = 0;
                dataBuf = dataBuf.uint32(result);
                break;
            }

            // scale up if number is too big
            while (mantissa > 0x007FFFFD) {
                mantissa /= 10.0;
                ++exponent;
                if (exponent > 127) {
                    // argh, should not happen
                    if (sgn > 0) {
                        result = 0x007FFFFE;
                    } else {
                        result = 0x00800002;
                    }
                    dataBuf = dataBuf.uint32(result);
                    break;
                }
            }

            // scale down if number is too small
            while (mantissa < 1) {
                mantissa *= 10;
                --exponent;
                if (exponent < -128) {
                    // argh, should not happen
                    result = 0;
                    dataBuf = dataBuf.uint32(result);
                    break;
                }
            }

            // scale down if number needs more precision
            smantissa = Math.round(mantissa * 10000000);
            rmantissa = Math.round(mantissa) * 10000000;
            mdiff = Math.abs(smantissa - rmantissa);
            while (mdiff > 0.5 && exponent > -128 && (mantissa * 10) <= 0x007FFFFD) {
                mantissa *= 10;
                --exponent;
                smantissa = Math.round(mantissa * 10000000);
                rmantissa = Math.round(mantissa) * 10000000;
                mdiff = Math.abs(smantissa - rmantissa);
            }

            int_mantissa = parseInt(Math.round(sgn * mantissa));
            result = ((exponent & 0xFF) << 24) | (int_mantissa & 0xFFFFFF);
            dataBuf = dataBuf.int32(result);
            break;
        case 'buffer': 
        case 'variable': 
            dataBuf = dataBuf.buffer(val);
            break;
        default:
            throw new Error("Unknown Data Type");
    }

    return dataBuf;
}

function generateListBuf(dataBuf, listVal, objInfo) {
    _.forEach(listVal, function (val) {
        dataBuf = dataBuf[objInfo.types[0]](val);
    });

    return dataBuf;
}

function buildExtraRule (uuid, extMeta) {
    var extraRule;

    switch (uuid) {
        case '0x290a':
            extraRule = ru['0x290a'](extMeta.params, extMeta.types);
            break;
        case '0x290e':
            extraRule = ru['0x290e'](extMeta.params, extMeta.types);
            break;
        case '0x290d':
            //TODO variable
        case '0x2a2a':
            //TODO reg-cert-data-list
            break;
        case '0x2a55':
            // extraRules.push(ru['variable'](extParams, extTypes, extResult, extValLen));
            // break;
        case '0x2a63':
        case '0x2a64':
            //TODO Optional
        case '0x2a6b':
        case '0x2a66':
        case '0x2a9f':
        case '0x2aa4':
        case '0x2aa7':
            //TODO variable
        case '0x2aa9':
        case '0x2aaa':
        case '0x2aab':
        case '0x2aac':
            //TODO E2E-CRC
            break;
        default:
            extraRule = ru.valsRules(extMeta.params, extMeta.types, extMeta.flags, extMeta.result, extMeta.params.length);
            break;
    }

    return extraRule;
}

function str2Buf (str) {
    var bufLen,
        val,
        chunk,
        tmpBuf;

    if (_.startsWith(str, '0x')) { str = str.slice(2); }
    bufLen = str.length / 2;
    tmpBuf = (new Buffer(bufLen)).fill(0);
    for (var i = 0; i < bufLen; i += 1) {
        chunk = str.substring(0, 2);
        val = _.parseInt(chunk, 16);
        str = str.slice(2);
        tmpBuf.writeUInt8(val, (bufLen-i-1));
    }

    return tmpBuf;
}

function buf2Str(buf) {
    var bufLen = buf.length,
        val,
        strChunk = '0x';

    for (var i = 0; i < bufLen; i += 1) {
        val = buf.readUInt8(bufLen-i-1);

        if (val <= 15) {
            strChunk += '0' + val.toString(16);
        } else {
            strChunk += val.toString(16);
        }
    }

    return strChunk;
}

function uint2sfloat(ieee11073) {
    var reservedValues = {
            0x07FE: 'PositiveInfinity',
            0x07FF: 'NaN',
            0x0800: 'NaN',
            0x0801: 'NaN',
            0x0802: 'NegativeInfinity'
        },
        mantissa = ieee11073 & 0x0FFF;

    if (!_.isNil(reservedValues[mantissa])) return reservedValues[mantissa];

    if (mantissa >= 0x0800) mantissa = -(0x1000 - mantissa);

    var exponent = ieee11073 >> 12;

    if (exponent >= 0x08) exponent = -(0x10 - exponent);

    var magnitude = Math.pow(10, exponent);
    return (mantissa * magnitude);  
}

function uint2float(ieee11073) {
    var reservedValues = {
            0x007FFFFE: 'PositiveInfinity',
            0x007FFFFF: 'NaN',
            0x00800000: 'NaN',
            0x00800001: 'NaN',
            0x00800002: 'NegativeInfinity'
        },
        mantissa = ieee11073 & 0x00FFFFFF;

    if (!_.isNil(reservedValues[mantissa])) return reservedValues[mantissa];
    
    if (mantissa >= 0x800000) mantissa = -(0x1000000 - mantissa);
    
    var exponent = ieee11073 >> 24;

    if (exponent >= 0x10) exponent = -(0x100 - exponent);

    var magnitude = Math.pow(10, exponent);
    return (mantissa * magnitude);  
}

module.exports = BleObject;