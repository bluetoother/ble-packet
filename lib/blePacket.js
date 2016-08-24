/* jshint node: true */
'use strict';

var _ = require('busyman'),
    bipso = require('bipso');

var charMeta = require('./defs/charMeta'),
    BleObject = require('./bleObject');

var blePacket = {};

blePacket.frame = function (uuid, data) {
	if (_.isNil(charMeta[uuid]) && _.isNil(bipso.uo(uuid)))
        return data;
    else
    	return new BleObject(uuid).frame(data);
};

blePacket.parse = function (uuid, bBuf, callback) {
    if (_.isNil(charMeta[uuid]) && _.isNil(bipso.uo(uuid)))
        process.nextTick(function () {
            callback(null, bBuf);
        });
    else
        new BleObject(uuid).parse(bBuf, callback);
};

blePacket.getMeta = function (uuid) {
    return charMeta[uuid];
};

blePacket.addMeta = function (uuid, charInfo) {
    if (!_.isArray(charInfo.params))
        throw new Error('charInfo.params must be an array');

    if (!_.isArray(charInfo.types))
        throw new Error('charInfo.types must be an array');

    charMeta[uuid] = charInfo;
};

module.exports = blePacket;