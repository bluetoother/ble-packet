# ble-packet
**ble-packet** is a framer and parser for BLE attributes on node.js

[![NPM](https://nodei.co/npm/ble-packet.png?downloads=true)](https://nodei.co/npm/ble-packet/)  

[![Build Status](https://travis-ci.org/bluetoother/ble-packet.svg?branch=master)](https://travis-ci.org/bluetoother/ble-packet)
[![npm](https://img.shields.io/npm/v/ble-packet.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-packet)
[![npm](https://img.shields.io/npm/l/ble-packet.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-packet)

<br />

## Documentation  

Please visit the [Wiki](https://github.com/bluetoother/ble-packet/wiki).

<br />

## Overview  

The **ble-packet** is the packet builder and parser used for process BLE attributes if they are [_GATT Specifications-defined_](https://www.bluetooth.com/specifications/GATT) ones or [_BIPSO Specifications-defined_](https://github.com/bluetoother/bipso/blob/master/doc/spec.md) ones.

<br />

## GATT Specifications  

In BLE, an attributes is the smallest data entity defined by GATT (Generic Attributes). Attributes are used to describe the hierarchical data organization, such as **Services** and **Characteristics**, and pieces of the user data. A Service conceptually groups all the related Characteristics together, and each **Characteristic** always contain at least two attributes: *Characteristic Declaration* and *Characteristic Value*.

<br />

### Installation  

> $ npm install ble-packet --save

<br />

### Usage  

See [Usage](https://github.com/bluetoother/ble-packet/wiki#Usage) on the Wiki.  

<br />

## License  

Licensed under [MIT](https://github.com/bluetoother/ble-packet/blob/master/LICENSE).