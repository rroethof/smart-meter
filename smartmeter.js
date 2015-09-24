serialport = require('serialport');
var mqtt = require('mqtt');
 
var mclient,
    config,
    SerialPort,
    smartMeter;
 
mclient = mqtt.createClient(1883, 'localhost'); //set ip of the Rasp or localhost
var net = require('net');
var client = new net.Socket();
 
function SmartMeter() {
  this.ConsumedPowerRate1 = 0;
  this.ConsumedPowerRate2 = 0;
  this.ProducedPowerRate1 = 0;
  this.ProducedPowerRate2 = 0;
  this.ActualPowerRate = 0;
  this.ActualConsumedPower = 0;
  this.ActualProducedPower = 0;
  this.GasTimestamp = 0;
  this.ConsumedGas = 0;
}
 
SmartMeter.prototype.update = function(data) {
    //publish the complete telegram to a different topic for logging to for example a mysql dbase (handled in my next blog)
    mclient.publish('historical/smartmeter/data', JSON.stringify(data));
     
    if(data.ConsumedPowerRate1 != this.ConsumedPowerRate1) {
        this.ConsumedPowerRate1 = data.ConsumedPowerRate1;
        mclient.publish('smartmeter/consumed_low', data.ConsumedPowerRate1.toString(), {retain: true});
        //console.log(data.ConsumedPowerRate1)
    }
  
    if(data.ConsumedPowerRate2 != this.ConsumedPowerRate2) {
        this.ConsumedPowerRate2 = data.ConsumedPowerRate2;
        mclient.publish('smartmeter/consumed_high', data.ConsumedPowerRate2.toString(), {retain: true});
        //console.log(data.ConsumedPowerRate2)
    }
  
    if(data.ProducedPowerRate1 != this.ProducedPowerRate1) {
        this.ProducedPowerRate1 = data.ProducedPowerRate1;
        mclient.publish('smartmeter/produced_low', data.ProducedPowerRate1.toString(), {retain: true});
        //console.log(data.ProducedPowerRate1)
    }
  
    if(data.ProducedPowerRate2 != this.ProducedPowerRate2) {
        this.ProducedPowerRate2 = data.ProducedPowerRate2;
        mclient.publish('smartmeter/produced_high', data.ProducedPowerRate2.toString(), {retain: true});
        //console.log(data.ProducedPowerRate2)
    }
  
    if(data.ActualPowerRate != this.ActualPowerRate) {
        //console.log(this.ActualPowerRate);
        if (data.ActualPowerRate == 1) {var new_ActualPowerRate = 'Low'}
        else {var new_ActualPowerRate = 'High'}; 
        this.ActualPowerRate = data.ActualPowerRate;
        mclient.publish('smartmeter/actual_rate', new_ActualPowerRate, {retain: true});
        //console.log(new_ActualPowerRate);
        }
  
    if(data.ActualConsumedPower != this.ActualConsumedPower) {
        this.ActualConsumedPower = data.ActualConsumedPower;
        mclient.publish('smartmeter/actual_consumed', data.ActualConsumedPower.toString(), {retain: true});
        console.log(data.ActualConsumedPower)
        }
  
    if(data.ActualProducedPower != this.ActualProducedPower) {
        this.ActualProducedPower = data.ActualProducedPower;
        mclient.publish('smartmeter/actual_produced', data.ActualProducedPower.toString(), {retain: true});
        //console.log(data.ActualProducedPower)
    }
  
    if(this.GasTimestamp != data.GasTimestamp) {
        this.ConsumedGas = data.ConsumedGas;
        this.GasTimestamp = data.GasTimestamp;
        mclient.publish('smartmeter/gas', data.ConsumedGas.toString(), {retain: true});
        //console.log(data.ConsumedGas)
    }
};
function processTelegram(telegram) {

    var smartMeterId,
        consumedPowerRate1,
        consumedPowerRate2,
        actualConsumedPower,
        actualPowerRate,
        producedPowerRate1,
        producedPowerRate2,
        actualProducedPower,
        gasTimestamp,
        consumedGas;
 
    if(telegram.length === 25) {
        // Process equipment label
        smartMeterId = telegram[0].substr(1);
 
        // Process consumed power
        consumedPowerRate1 = parseFloat(telegram[5].substr(10,9));
        consumedPowerRate2 = parseFloat(telegram[6].substr(10,9));
        actualConsumedPower = parseFloat(telegram[10].substr(10,9));
        actualPowerRate = parseInt(telegram[9].substr(12,4));
 
        // Process produced power
        producedPowerRate1 = parseFloat(telegram[7].substr(10,9));
        producedPowerRate2 = parseFloat(telegram[8].substr(10,9));
        actualProducedPower = parseFloat(telegram[11].substr(10,9));
 
        // Process gas related items
        // Get timestamp last report and convert it to epoch UTC format
        gasTimestamp = new Date(
            parseInt(telegram[24].substr(11,2)) +  2000,
            parseInt(telegram[24].substr(13,2)) - 1,
            parseInt(telegram[24].substr(15,2)),
            parseInt(telegram[24].substr(17,2)),
            parseInt(telegram[24].substr(19,2)),
            parseInt(telegram[24].substr(21,2))
        );
        gasTimestamp = Math.round(gasTimestamp.getTime() / 1000);
        consumedGas = parseFloat(telegram[24].substr(1,9));
//////
        console.log('Gas Timestamp: ' + gasTimestamp);
        console.log('Gas Consumed: ' + consumedGas);
/////
        smartMeter.update({
            ConsumedPowerRate1: consumedPowerRate1,
            ConsumedPowerRate2: consumedPowerRate2,
            ProducedPowerRate1: producedPowerRate1,
            ProducedPowerRate2: producedPowerRate2,
            ActualConsumedPower: actualConsumedPower,
            ActualProducedPower: actualProducedPower,
            ActualPowerRate: actualPowerRate,
            GasTimestamp: gasTimestamp,
            ConsumedGas: consumedGas
        }); 
    } else {
        console.log('Invalid number of lines in telegram (' + 
            telegram.length + ')');
    }
}
 
function main() {
     
    var telegram = [];
    console.log('Starting Smart Meter');
 
    SerialPort = serialport.SerialPort;
    smartMeter = new SmartMeter();
 
    serialPort = new SerialPort("/dev/ttyUSB0", {
        baudrate: 115200,
        databits: 8,
        parity: 'none',
        parser: serialport.parsers.readline('\n')
    });
 
    serialPort.on('data', function(line) {
        console.log('Received: ' + line);
        if(line[0] === '!') {
            processTelegram(telegram);
            telegram.length = 0;
        } else {
            telegram.push(line);
        }
    });
}
main();
