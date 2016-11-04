var outData = new Uint8Array(128*128);
var preData = [];
var intervalCount = 0;
var tCount = 0;
var initFrame = true;
var socketOpen = false;
function socketLink()
{
	console.log("hello");
	var port = 8888

	/*==========  Websocket Connection ==========*/

	var url = "ws://localhost:" + port + "/ws"
	var ws = new WebSocket(url);

	ws.onerror = function(e) {
	  console.log("Make sure the websocket server is running through Python.")
	};

	ws.onopen = function() {
	   ws.send("connect success");
	   socketOpen = true;
	};

	ws.onclose = function() {
	   console.log("close socket!");
	};

	ws.onmessage = function (evt) {
	    var array = JSON.parse(evt.data)
	    pixelData = array[0];
	    rainData = array[1];
	    preData = outData.slice();
	    intervalCount = tCount;
	    tCount = 0;
	    for(var i = 0; i < pixelData.length; i++)
	    	outData[i] = pixelData[i];

	};
}

