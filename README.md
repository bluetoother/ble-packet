ble-packet
========================

**ble-packet** is a framer and parser for BLE attributes defined by GATT Specifications

[![NPM](https://nodei.co/npm/ble-packet.png?downloads=true)](https://nodei.co/npm/ble-packet/)  

[![Build Status](https://img.shields.io/travis/bluetoother/ble-packet/master.svg?maxAge=2592000)](https://travis-ci.org/bluetoother/ble-packet)
[![npm](https://img.shields.io/npm/v/ble-packet.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-packet)
[![npm](https://img.shields.io/npm/l/ble-packet.svg?maxAge=2592000)](https://www.npmjs.com/package/ble-packet)


## Table of Contents  

1. [Overview](#Overview)  
    1.1 [GATT Specifications](#GATT)
    1.2 [Installation](#Installation)  
    1.3 [Usage](#Usage)  
2. [APIs](#APIs): [frame()](#API_frame), and [parse()](#API_parse)
3. [Appendix](#Appendix)  
    3.1 [GATT Characteristics](#Characteristics)  
    3.2 [GATT Declarations](#Declarations)  
    3.3 [GATT Descriptors](#Descriptors)
4. [License](#License)  

<br />


<a name="Overview"></a>
## 1. Overview  

The **ble-packet** is the packet builder and parser used for process BLE attributes if they are [_GATT Specifications-defined_](https://www.bluetooth.com/specifications/GATT) ones.

<br />

<a name="GATT"></a>
### 1.1 GATT Specifications  

In BLE, an attributes is the smallest data entity defined by GATT (Generic Attributes). Attributes are used to describe the hierarchical data organization, such as **Services** and **Characteristics**, and pieces of the user data. A Service conceptually groups all the related Characteristics together, and each **Characteristic** always contain at least two attributes: *Characteristic Declaration* and *Characteristic Value*.

<br />

<a name="Installation"></a>
### 1.2 Installation  

> $ npm install ble-packet --save

<br />

<a name="Usage"></a>
### 1.3 Usage  

Require the module:
```js
var blePacket = require('ble-packet');
```

Using `.frame()` and `.parse()` methods to build and parse BLE attributes is quite simple. Here are some quick examples:  

* Build a raw buffer of Characteristic Value

```js
var connParamsVal = {
        minConnInterval: 100,
        maxConnInterval: 500.
        latency: 0,
        timeout: 2000
    },
    charBuf = blePacket.frame('0x2a04', {});
```

* Parse a Characteristic raw packet into an object  

```js
var charPacket = new Buffer([ 0x00, 0x00, 0x02, ... ]);

blePacket.parse('0x2a04', charPacket, function (err, result) {
    if (!err)
        console.log(result);  // The parsed result
});
```

<br />

<a name="APIs"></a>
## 2. APIs  

* [frame()](#API_frame)  
* [parse()](#API_parse)  

*************************************************
<a name="API_frame"></a>
### .frame(uuid, value)

Generate the raw packet of a GATT-defined attribute value.

**Arguments: **

1. `uuid` (_String_ | _Number_): UUID defined in [GATT Specifications](https://www.bluetooth.com/specifications/GATT).
2. `value` (_Object_): A GATT-defined attribute value.

**Returns**

* (_Buffer_): Raw buffer of given BLE attribute.  

**Example:**

```js
var dayDateUuid = '0x2a0a',
    dayDateVal = {
        year: 1945,
        month: 7,
        day: 19,
        hours: 9,
        minutes: 0,
        seconds: 0,
        dayOfWeek: 2
    }

blePacket.frame(dayDateUuid, dayDateVal);   // <Buffer 99 07 07 13 09 00 00 02>
```

*************************************************
<a name="API_parse"></a>
### .parse(uuid, buf, callback)

Parse a raw buffer into a GATT-defined attribute value.

**Arguments: **

1. `uuid` (_String_ | _Number_): UUID defined in [GATT Specifications](https://www.bluetooth.com/specifications/GATT).
2. `buf` (_Buffer_): Raw buffer to be parsed.
3. `callback` (_Function_): `function(err, result) {...}`. Get called when the buffer is parsed.

**Returns**

* (_None_)

**Example:**

```js
var dayDateUuid = '0x2a0a',
    rawBuf = new Buffer([ 99, 07, 07, 13, 09, 00, 00, 02 ]);

blePacket.parse(dayDateUuid, rawBuf, function(err, result) {
    if (err)
        console.log(err);
    else
        console.log(result);

    // Result object
    // {
    //     year: 1945,
    //     month: 7,
    //     day: 19,
    //     hours: 9,
    //     minutes: 0,
    //     seconds: 0,
    //     dayOfWeek: 2
    // }
});
```

<br />

<a name="Appendix"></a>
## 3. Appendix  

<a name="Characteristics"></a>
### 3.1 GATT Characteristics

* A [Characteristic](https://www.bluetooth.com/specifications/gatt/characteristics) is a container of the user data. It is defined by
    * **UUID**: a 16-bit number defined by SIG to represent a attribute
    * **Value**: actual value of the user data which is a piece of bytes

* **Value** is a logical value and ble-packet can parse it into an object according to particular rules. The following table gives the fields and their data types of a parsed object.  
* The 'flags' field tells how to parse the **Value**, and the rule is given with something like tempF(`bit0`) and tempC(`!bit0`).  
    - tempF(`bit0`) means that if bit0 of 'flags' is 1, the field `tempF` will be picked and parsed.  
    - tempC(`!bit0`) means that if bit0 of 'flags' is 0, the field `tempC` will be picked and parsed.  
    - medicationL(`bit4 & bit5`) means that if bit4 and bit5 of 'flags' are both 1, the field `medicationL` will be picked and parsed.  
    - Here is an example of the parsed result object of a Characteristic with UUID 0x2a1c

        ```js
        {   // Result object of UUID 0x2a1c 
            flags: 2,       // bit0 = 0, bit1 = 1, bit2 = 0
            tempC: 21.5,    // tempC(!bit0)
            year: 2015,     // year(bit1)
            month: 12,      // month(bit1)
            day: 25,        // day(bit1)
            hours: 21,      // hours(bit1)
            minutes: 36,    // minutes(bit1) 
            seconds: 12     // seconds(bit1) 
        }
        ```

<br />

**Note**:  

* A field type of **_list(type)_** indicates that value of this field is an array and _(type)_ tells the data type of each entry in it.  

```js
{   // Result object of UUID 0x2a22, Field type: list(uint8)
    bootKeyboardInputReport: [1, 2, 3]
}
```

* ble-packet can not build and parse the packet comes with the following commands, since the input to each command is probably not an eligible Characteristic Value.  
    * `'ATT_ReadBlobRsp'`, `'ATT_PrepareWriteReq'`, `'ATT_PrepareWriteRsp'`,  `'GATT_WriteLongCharValue'`, `'GATT_ReliableWrites'`
* ble-packet can not build and parse the Characteristic Value comes with the following UUIDs, since there are fields with variable length, optional, or unknown.  
    * `'0x2a2a'`, `'0x2a55'`, `'0x2a5a'`, `'0x2a63'`, `'0x2a64'`, `'0x2a66'`, `'0x2a6b'`, `'0x2aa4'`, `'0x2aa7'`, `'0x2aa9'`, `'0x2aaa'`, `'0x2aab'`, `'0x2aac'`

| UUID | Field Names | Filed types |
|  -------------  |  -------------  |  -------------  | 
| 0x2a00 | name | string | 
| 0x2a01 | category | uint16 | 
| 0x2a02 | flag | boolean | 
| 0x2a03 | addr | addr6 | 
| 0x2a04 | minConnInterval, maxConnInterval, latency, timeout | uint16, uint16, uint16, uint16 | 
| 0x2a05 | startHandle, endHandle | uint16, uint16 | 
| 0x2a06 | alertLevel | uint8 | 
| 0x2a07 | txPower | int8 | 
| 0x2a08 | year, month, day, hours, minutes, seconds | uint16, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a09 | dayOfWeek | uint8 | 
| 0x2a0a | year, month, day, hours, minutes, seconds, dayOfWeek | uint16, uint8, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a0c | year, month, day, hours, minutes, seconds, dayOfWeek, fractions256 | uint16, uint8, uint8, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a0d | dstOffset | uint8 | 
| 0x2a0e | timeZone | int8 | 
| 0x2a0f | timeZone, dstOffset | int8, uint8 | 
| 0x2a11 | year, month, day, hours, minutes, seconds, dstOffset | uint16, uint8, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a12 | accuracy | uint8 | 
| 0x2a13 | timeSource | uint8 | 
| 0x2a14 | source, accuracy, daySinceUpdate, hourSinceUpdate | uint8, uint8, uint8, uint8 | 
| 0x2a16 | timeUpdateCtrl | uint8 | 
| 0x2a17 | currentState, result | uint8, uint8 | 
| 0x2a18 | flags, sequenceNum, year, month, day, hours, minutes, seconds, timeOffset(`bit0`), glucoseKg(`bit1 & !bit2`), glucoseMol(`bit1 & bit2`), type(`bit2`), sampleLocation(`bit2`), sensorStatus(`bit3`) | uint8, uint16, uint16, uint8, uint8, uint8, uint8, uint8,  | int16, sfloat, sfloat, nibble, nibble, uint16 | 
| 0x2a19 | level | uint8 | 
| 0x2a1c | flags, tempC(`!bit0`), tempF(`bit0`), year(`bit1`), month(`bit1`), day(`bit1`), hours(`bit1`), minutes(`bit1`), seconds(`bit1`), tempType(`bit2`) | uint8, float, float, uint16, uint8, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a1d | tempTextDesc | uint8 | 
| 0x2a1e | flags, tempC(`!bit0`), tempF(`bit0`), year(`bit1`), month(`bit1`), day(`bit1`), hours(`bit1`), minutes(`bit1`), seconds(`bit1`), tempType(`bit2`) | uint8, float, float, uint16, uint8, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a21 | measureInterval | uint16 | 
| 0x2a22 | bootKeyboardInput | list(uint8) | 
| 0x2a23 | manufacturerID, organizationallyUID | addr5, addr3 | 
| 0x2a24 | modelNum | string | 
| 0x2a25 | serialNum | string | 
| 0x2a26 | firmwareRev | string | 
| 0x2a27 | hardwareRev | string | 
| 0x2a28 | softwareRev | string | 
| 0x2a29 | manufacturerName | string | 
| 0x2a2b | year, month, day, hours, minutes, seconds, dayOfWeek, fractions256, adjustReason | uint16, uint8, uint8, uint8, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a2c | magneticDeclination | uint16 | 
| 0x2a31 | scanRefresh | uint8 | 
| 0x2a32 | bootKeyboardOutput | list(uint8) | 
| 0x2a33 | bootMouseInput | list(uint8) | 
| 0x2a34 | flags, sequenceNum, extendedFlags(`bit7`), carbohydrateID(`bit0`), carbohydrate(`bit0`), meal(`bit1`), tester(`bit1`), health(`bit2`), exerciseDuration(`bit3`), exerciseIntensity(`bit3`), medicationID(`bit4`), medicationKg(`bit4 & !bit5`), medicationL(`bit4 & bit5`), hbA1c(`bit6`) | uint8, uint16, uint8, uint8, sfloat, uint8, nibble, nibble, uint16, uint8, uint8, sfloat, sfloat, sfloat | 
| 0x2a35 | flags, systolicMmHg(`!bit0`), diastolicMmHg(`!bit0`), arterialPresMmHg(`!bit0`), systolicKpa(`bit0`), diastolicKpa(`bit0`), arterialPresKpa(`bit0`), year(`bit1`), month(`bit1`), day(`bit1`), hours(`bit1`), minutes(`bit1`), seconds(`bit1`), pulseRate(`bit2`), userID(`bit3`), status(`bit4`) | uint8, sfloat, sfloat, sfloat, sfloat, sfloat, sfloat, uint16, uint8, uint8, uint8, uint8, uint8, sfloat, uint8, uint16 | 
| 0x2a36 | flags, systolicMmHg(`!bit0`), diastolicMmHg(`!bit0`), arterialPresMmHg(`!bit0`), systolicKpa(`bit0`), diastolicKpa(`bit0`), arterialPresKpa(`bit0`), year(`bit1`), month(`bit1`), day(`bit1`), hours(`bit1`), minutes(`bit1`), seconds(`bit1`), pulseRate(`bit2`), userID(`bit3`), status(`bit4`) | uint8, sfloat, sfloat, sfloat, sfloat, sfloat, sfloat, uint16, uint8, uint8, uint8, uint8, uint8, sfloat, uint8, uint16 | 
| 0x2a37 | flags, heartRate8(`!bit0`), heartRate16(`bit0`), energyExpended(`bit3`), rrInterval(`bit4`) | uint8, uint8, uint16, uint16, uint16 | 
| 0x2a38 | bodySensorLocation | uint8 | 
| 0x2a39 | heartRateCtrl | uint8 | 
| 0x2a3f | alertStatus | uint8 | 
| 0x2a40 | ringerCtrlPoint | uint8 | 
| 0x2a41 | ringerSet | uint8 | 
| 0x2a42 | categoryIDBitMask0, categoryIDBitMask1 | uint8, uint8 | 
| 0x2a43 | categoryID | uint8 | 
| 0x2a44 | commID, categoryID | uint8, uint8 | 
| 0x2a45 | categoryID, unreadCount | uint8, uint8 | 
| 0x2a46 | categoryID, newAlert, textStringInfo | uint8, uint8, string | 
| 0x2a47 | categoryIDBitMask0, categoryIDBitMask1 | uint8, uint8 | 
| 0x2a48 | categoryIDBitMask0, categoryIDBitMask1 | uint8, uint8 | 
| 0x2a49 | feature | uint16 | 
| 0x2a4a | bcdHID, bCountryCode, flags | uint16, uint8, uint8 | 
| 0x2a4b | reportMap | list(uint8) | 
| 0x2a4c | hidCtrl | uint8 | 
| 0x2a4d | report | list(uint8) | 
| 0x2a4e | protocolMode | uint8 | 
| 0x2a4f | leScanInterval, leScanWindow | uint16, uint16 | 
| 0x2a50 | vendorIDSource, vendorID, productID, productVersion | uint8, uint16, uint16, uint16 | 
| 0x2a51 | feature | uint16 | 
| 0x2a52 | opcode, operand | uint8, uint8, uint8 | 
| 0x2a53 | flags, speed, cadence, strideLength(`bit0`), totalDist(`bit1`) | uint8, uint16, uint8, uint16, uint32 | 
| 0x2a54 | feature | uint16 | 
| 0x2a56 | digital | uint8 | 
| 0x2a58 | analog | uint16 | 
| 0x2a5b | flags, cumulativeWheelRev(`bit0`), lastWheelEventTime(`bit0`), cumulativeCrankRev(`bit1`), lastCrankEventTime(`bit1`) | uint8, uint32, uint16, uint16, uint16 | 
| 0x2a5c | feature | uint16 | 
| 0x2a5d | sensorLocation | uint8 | 
| 0x2a5e | flags, spotCheckSpO2, spotCheckPr, year(`bit0`), month(`bit0`), day(`bit0`), hours(`bit0`), minutes(`bit0`), seconds(`bit0`), measureStatus(`bit1`), deviceAndSensorStatus(`bit2`), pulseAmpIndex(`bit3`) | uint8, sfloat, sfloat, uint16, uint8, uint8, uint8, uint8, uint8, uint16, uint24, sfloat | 
| 0x2a5f | flags, normalSpO2, normalPR, fastSpO2(`bit0`), fastPR(`bit0`), slowSpO2(`bit1`), slowPR(`bit1`), measureStatus(`bit2`), deviceAndSensorStatus(`bit3`), pulseAmpIndex(`bit4`) | uint8, sfloat, sfloat, sfloat, sfloat, sfloat, sfloat, uint16, uint24, sfloat | 
| 0x2a65 | feature | uint32 | 
| 0x2a67 | flags, instantSpeed(`bit0`), totalDist(`bit1`), latitude(`bit2`), longitude(`bit2`), elevation(`bit3`), heading(`bit4`), rollingTime(`bit5`), year(`bit6`), month(`bit6`), day(`bit6`), hours(`bit6`), minutes(`bit6`), seconds(`bit6`) | uint8, uint16, uint24, int32, int32, int24, uint16, uint8, uint16, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a68 | flags, bearing, heading, remainingDist(`bit0`), remainingVertDist(`bit1`), year(`bit2`), month(`bit2`), day(`bit2`), hours(`bit2`), minutes(`bit2`), seconds(`bit2`) | uint8, uint16, uint16, uint24, int24, uint16, uint8, uint8, uint8, uint8, uint8 | 
| 0x2a69 | flags, beaconsInSolution(`bit0`), beaconsInView(`bit1`), timeToFirstFix(`bit2`), ehpe(`bit3`), evpe(`bit4`), hdop(`bit5`), vdop(`bit6`) | uint8, uint8, uint8, uint16, uint32, uint32, uint8, uint8 | 
| 0x2a6a | feature | uint32 | 
| 0x2a6c | elevation | int24 | 
| 0x2a6d | pressure | uint32 | 
| 0x2a6e | temp | int16 | 
| 0x2a6f | humidity | uint16 | 
| 0x2a70 | trueWindSpeed | uint16 | 
| 0x2a71 | trueWindDirection | uint16 | 
| 0x2a72 | apparentWindSpeed | uint16 | 
| 0x2a73 | apparentWindDirection | uint16 | 
| 0x2a74 | gustFactor | uint8 | 
| 0x2a75 | pollenConc | uint24 | 
| 0x2a76 | uvIndex | uint8 | 
| 0x2a77 | irradiance | uint16 | 
| 0x2a78 | rainfall | uint16 | 
| 0x2a79 | windChill | int8 | 
| 0x2a7a | heatIndex | int8 | 
| 0x2a7b | dewPoint | int8 | 
| 0x2a7d | flag, uuid | uint16, uuid | 
| 0x2a7e | lowerLimit | uint8 | 
| 0x2a7f | threshold | uint8 | 
| 0x2a80 | age | uint8 | 
| 0x2a81 | lowerLimit | uint8 | 
| 0x2a82 | upperLimit | uint8 | 
| 0x2a83 | threshold | uint8 | 
| 0x2a84 | upperLimit | uint8 | 
| 0x2a85 | year, month, day | uint16, uint8, uint8 | 
| 0x2a86 | year, month, day | uint16, uint8, uint8 | 
| 0x2a87 | emailAddr | string | 
| 0x2a88 | lowerLimit | uint8 | 
| 0x2a89 | upperLimit | uint8 | 
| 0x2a8a | firstName | string | 
| 0x2a8b | veryLightAndLight, lightAndModerate, moderateAndHard, hardAndMax | uint8, uint8, uint8, uint8 | 
| 0x2a8c | gender | uint8 | 
| 0x2a8d | heartRateMax | uint8 | 
| 0x2a8e | height | uint16 | 
| 0x2a8f | hipCircumference | uint16 | 
| 0x2a90 | lastName | string | 
| 0x2a91 | maxHeartRate | uint8 | 
| 0x2a92 | restingHeartRate | uint8 | 
| 0x2a93 | sportType | uint8 | 
| 0x2a94 | lightAndModerate, moderateAndHard | uint8, uint8 | 
| 0x2a95 | fatburnAndFitness | uint8 | 
| 0x2a96 | vo2Max | uint8 | 
| 0x2a97 | waistCir | uint16 | 
| 0x2a98 | weight | uint16 | 
| 0x2a99 | changeIncrement | uint32 | 
| 0x2a9a | userIndex | uint8 | 
| 0x2a9b | feature | uint32 | 
| 0x2a9c | flags, bodyFatPercent, year(`bit1`), month(`bit1`), day(`bit1`), hours(`bit1`), minutes(`bit1`), seconds(`bit1`), userID(`bit2`), basalMetabolism(`bit3`), musclePercent(`bit4`), muscleMassKg(`!bit0 & bit5`), muscleMassPounds(`bit0 & bit5`), fatFreeMassKg(`!bit0 & bit6`), fatFreeMassPounds(`bit0 & bit6`), softLeanMassKg(`!bit0 & bit7`), softLeanMassPounds(`bit0 & bit7`), bodyWaterMassKg(`!bit0 & bit8`), bodyWaterMassPounds(`bit0 & bit8`), impedance(`bit9`), weightKg(`!bit0 & bit10`), weightPounds(`bit0 & bit10`), heightMeters(`!bit0 & bit11`), heightInches(`bit0 & bit11`) | uint16, uint16, uint16, uint8, uint8, uint8, uint8, uint8, uint8, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16, uint16 | 
| 0x2a9d | flags, weightSI(`!bit0`), weightImperial(`bit0`), year(`bit1`), month(`bit1`), day(`bit1`), hours(`bit1`), minutes(`bit1`), seconds(`bit1`), userID(`bit2`), bmi(`bit3`), heightSI(`!bit0 & bit3`), heightImperial(`bit0 & bit3`) | uint8, uint16, uint16, uint16, uint8, uint8, uint8, uint8, uint8, uint8, uint16, uint16, uint16 | 
| 0x2a9e | feature | uint32 | 
| 0x2a9f | opcode, parameter | uint8, buffer |
| 0x2aa0 | xAxis, yAxis | int16, int16 | 
| 0x2aa1 | xAxis, yAxis, zAxis | int16, int16, int16 | 
| 0x2aa2 | language | string | 
| 0x2aa3 | barometricPresTrend | uint8 | 
| 0x2aa5 | feature | uint24 | 
| 0x2aa6 | addrResolutionSup | uint8 | 
| 0x2aa8 | feature, type, sampleLocation, e2eCrc | uint24, nibble, nibble, uint16 | 
| 0x2aad | indoorPosition | uint8 | 
| 0x2aae | latitude | int32 | 
| 0x2aaf | longitude | int32 | 
| 0x2ab0 | localNorthCoordinate | int16 | 
| 0x2ab1 | localEastCoordinate | int16 | 
| 0x2ab2 | floorNum | uint8 | 
| 0x2ab3 | altitude | uint16 | 
| 0x2ab4 | uncertainty | uint8 | 
| 0x2ab5 | locationName | string | 
| 0x2ab6 | uri | string | 
| 0x2ab7 | httpHeaders | string | 
| 0x2ab8 | statusCode, dataStatus | uint16, uint8 | 
| 0x2ab9 | httpEntityBody | string | 
| 0x2aba | opcode | uint8 | 
| 0x2abb | httpsSecurity | boolean | 
| 0x2abc | opcode, organizationID, parameter | uint8, uint8, buffer |
| 0x2abd | oacpFeatures, olcpFeatures | uint32, uint32 | 
| 0x2abe | objectName | string | 
| 0x2abf | objectType | uuid | 

<br />

<a name="Declarations"></a>
### 3.2 GATT Declarations

* A [**Declaration**](https://www.bluetooth.com/specifications/gatt/declarations) is an attribute to indicate the type of a GATT profile attribute. There are four types of GATT profile attributes defined by SIG, they are **Primary Service**(0x2800), **Secondary Service**(0x2801), **Include**(0x2802), and **Characteristic**(0x2803).  
* In **ble-packet**, a **Declaration** attribute can be parsed into an object with **Field Names**(keys) listed in the following table and **Field types** tells each data type of the corresponding field.  

| UUID | Field Names | Field types | 
|  -------------  |  -------------  |  -------------  | 
| 0x2800 | uuid | uuid | 
| 0x2801 | uuid | uuid | 
| 0x2802 | serviceAttrHandle, endGroupHandle, uuid | uint16, uint16, uuid | 
| 0x2803 | properties, handle, uuid | uint8, uint16, uuid | 

<br />

<a name="Descriptors"></a>
### 3.3 GATT Descriptors

* A **Descriptor** is an attribute that describes a Characteristic Value.  
* In **ble-packet**, a **Descriptor** will be parsed into an object with **Field Names**(keys) listed in the following table.  

**Note**:  

* A field type of **_list(type)_** indicates that value of this field is an array and _(type)_ tells the data type of each entry in it.  

| UUID | Field Names | Field types | 
| ------------- | ------------- | ------------- | 
| 0x2900 | properties | uint16 | 
| 0x2901 | userDescription | string | 
| 0x2902 | properties | uint16 | 
| 0x2903 | properties | uint16 | 
| 0x2904 | format, exponent, unit, namespace, description | uint8, int8, uint16, uint8, uint16 | 
| 0x2905 | listOfHandles | list(uint16) | 
| 0x2907 | extReportRef | uuid | 
| 0x2908 | reportID, reportType | uint8, uint8 | 
| 0x2909 | noOfDigitals | uint8 | 
| 0x290a | **condition**, analog(`1,2,3`), bitMask(`4`), analogInterval(`5,6`) | uint8, uint16, uint8, uint32 | 
| 0x290b | triggerLogic | uint8 | 
| 0x290c | flags, samplFunc, measurePeriod, updateInterval, application, measureUncertainty | uint16, uint8, uint24, uint24, uint8, uint8 | 
| 0x290e | **condition**, none(`0`), timeInterval(`1,2`), count(`3`) | uint8, uint8, uint24, uint16 | 

* Note about the **'condition'** field
    - The `'condition'` field is used to pick which fields should be parsed into the result object.  
    - For example, analogInterval(`5,6`) indicates that the result object will have `analogInterval` field if `condition` equals to 5 or 6.  
    - Here is an example of the result object. (The Descriptor with UUID 0x290a **may** have fields: `analog`, `bitMask`, and `analogInterval`, and which one will be picked depends on the value of `condition`)  

    ```JavaScript
    {   // Result object of Descriptor with UUID 0x290a
        condition: 5,
        analogInterval: 3000    // analogInterval(5,6)
    }
    ```


<a name="License"></a>
## 4. License  

The MIT License (MIT)

Copyright (c) 2016 
Hedy Wang <hedywings@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.