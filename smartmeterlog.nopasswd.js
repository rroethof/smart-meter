var mqtt = require('mqtt');
var mysql = require('mysql');
var client = mqtt.createClient(1883, 'localhost');
var queryQueue = [];
var db_config = {
  host     : 'localhost',  //or IPnr where the mysql server is running
  user     : 'xxx',   // fill in username
  password : 'xxx',   // password
  database : 'xxx'     /// and the database name, also needed below in the query command
};
 
function handleDisconnect() {
  db = mysql.createConnection(db_config); // Recreate the connection, since the old one cannot be reused.
 
  db.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    } else {
      console.log('mySQL connection established');
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  db.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}
 
setup();
 
function processQueryQueue() {
  if(queryQueue.length > 0) {
    var q = queryQueue[0];
    queryQueue.splice(0,1);
    console.log('EXECUTE '+q);
    db.query(q, function(err, result) {
      if (err) throw err;
        processQueryQueue();
    });
  } else {
    // finished
  }
}      
 
if ( !Date.prototype.toMySQLDateFormat ) {
  ( function() {
     
    function pad(number) {
      var r = String(number);
      if ( r.length === 1 ) {
        r = '0' + r;
      }
      return r;
    }
  
    Date.prototype.toMySQLDateFormat = function() {
      return    pad(this.getFullYear())
        + '-' + pad( this.getMonth()+1 )
        + '-' + pad( this.getDate() )
        + ' ' + pad( this.getHours() )
        + ':' + pad( this.getMinutes() )
        + ':' + pad( this.getSeconds() )
        + '.' + String( (this.getMilliseconds()/1000).toFixed(3) ).slice( 2, 5 );
    };
   
  }() );
}
 
function setup(){
     
  handleDisconnect();
  
  client.on('message', function(topic, payload){
       
    var res = JSON.parse(payload);
    var q = '';
    var s = (new Date()).toMySQLDateFormat() //+ '/'+ s;   
    var d = new Date();
    var n = d.getHours();
      q = "";
      q += "INSERT INTO smartmeter (datum, tijd, daguur, aantal, hour_consumed, hour_produced, consumed_rate1, consumed_rate2, produced_rate1, produced_rate2, actual_consumed, actual_produced, gas) ";
      q += "VALUES ('"+s+"'";
      q += ", '"+s+"'";
      q += ", '"+n.toString()+"'";
      q += ", '1'";
      q += ", '0'";
      q += ", '0'";
      q += ", '"+res.ConsumedPowerRate1+"'";
      q += ", '"+res.ConsumedPowerRate2+"'";
      q += ", '"+res.ProducedPowerRate1+"'";
      q += ", '"+res.ProducedPowerRate2+"'";
      q += ", '"+res.ActualConsumedPower+"'";
      q += ", '"+res.ActualProducedPower+"'";
      q += ", "+res.ConsumedGas;      
          q += ")";
          q += " ON DUPLICATE KEY UPDATE"
          q += " tijd='"+s+"',";
      q += " hour_consumed=hour_consumed+('"+res.ConsumedPowerRate1+"'-consumed_rate1)+('"+res.ConsumedPowerRate2+"'-consumed_rate2),";
      q += " hour_produced=hour_produced+('"+res.ProducedPowerRate1+"'-produced_rate1)+('"+res.ProducedPowerRate2+"'-produced_rate2),";
      q += " consumed_rate1='"+res.ConsumedPowerRate1+"',";
      q += " consumed_rate2='"+res.ConsumedPowerRate2+"',";
      q += " produced_rate1='"+res.ProducedPowerRate1+"',";
      q += " produced_rate2='"+res.ProducedPowerRate2+"',";
      q += " actual_consumed='"+res.ActualConsumedPower+"',";
      q += " actual_produced='"+res.ActualProducedPower+"',";
      q += " gas='"+res.ConsumedGas+"',";
          q += " aantal=aantal+1;";
     
    queryQueue.push(q);
    processQueryQueue();
 
  });   
   
  client.subscribe('historical/smartmeter/#');
  
}
