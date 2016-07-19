'use strict';

var _ = require('busyman');

var charMeta = require('./defs/charMeta'),
    charFramer = require('./charBuilder'),
    charParser = require('./charDiscriminator');

var blePacket = {};

blePacket.frame = function (uuid, data) {
    return charFramer(uuid).transToValObj(data).getCharBuf();
    
};

blePacket.parse = function (uuid, bBuf, callback) {
    charParser(uuid).getCharValPacket(bBuf, callback);
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