var url = require('url');
var path = require('path');
var mqtt = require('mqtt');
var httpd = require('http').createServer(handler),
    io = require('socket.io').listen(httpd),
    fs = require('fs');
httpd.listen(8300);
var client = mqtt.createClient(1883, 'localhost');
io.set('log level', 1);
var consumedValues = new Array();
var tmpValue;
var tmpValue1;
var uri = '/index.html';

// HTTP server
var MIMETYPES = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg" : "image/jpeg",
    "png" : "image/png",
    "js"  : "text/javascript",
    "css" : "text/css"};
     
function handler(req, res) {
   
  function html404(uri, res){
	res.writeHead(301,
	  {Location: 'https://cctv.home.familieroethof.nl/smartmeter.html'}
	);
	res.end();

//    res.writeHead(200, {'Content-Type': 'text/plain'});
//    res.write('404 Not Found\n');
//    res.end();
  }    
   
  var uri = url.parse(req.url).pathname;
  if(uri != '/'){
    var filename = path.join(process.cwd(), uri);
    fs.exists(filename, function(exists) {
        if(!exists) {
            html404(filename, res);
            return;
        }
        var mimeType = MIMETYPES[path.extname(filename).split(".")[1]];
        res.writeHead(200, {'Content-Type':mimeType});
        var fileStream = fs.createReadStream(filename);
        fileStream.pipe(res);
    });
  } else {
    html404(uri, res);
    return;
  }
  }
 
  httpd.on('clientError', function (exception, socket) { 
  console.log('Client error occurred');
});
   
io.sockets.on('connection', function (socket) {
  var clientbb = socket.handshake.address;
  console.log("New connection from " + clientbb.address + ":" + clientbb.port);
  socket.on('subscribe', function (data) {
    console.log('Subscribing to '+data.topic);
    //socket.join(data.topic);
    client.subscribe(data.topic);
  });
   
});
 
client.on('message', function(topic, payload){
    io.sockets.emit('mqtt', {'topic': String(topic),'payload':String(payload) });
    var newPayload = payload;
    switch (topic) { //settings for the graph
        case 'smartmeter/actual_produced':
            if (tmpValue1 == newPayload || newPayload == 0 ) {
                return;
            };  
            tmpValue = newPayload;          
            newPayload = newPayload - (newPayload * 2); //make produced value negative for chart
            break;
        case 'smartmeter/actual_consumed':
            if (tmpValue == newPayload) {
                return;
            };  
            tmpValue1 = newPayload;         
            break;
        default:
            return;
    };
         
    //if (tmpValue != newPayload || tmpValue1 != newPayload) {
        consumedValues.push(newPayload);
        //console.log(consumedValues);
        if (consumedValues.length >= 50) {
            //console.log ('Powervalue shifted');
            consumedValues.shift();
        }
    //};                    
     
    io.sockets.emit('mqtt', {'topic': "smartmeter/graph",'payload':consumedValues });   
         
});
