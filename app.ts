import * as http from "http";
import * as url from "url";
import * as express from "express";
import * as bodyParser from "body-parser";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");


var app = express();

// Configuration

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(__dirname + '/public'));

var env = process.env.NODE_ENV || 'development';
if (env === 'development') {
    app.use(errorHandler());
}


app.get('/', (req, res)=>{
    res.end("Hello");
});


app.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", 3000, app.settings.env);
});

export var App = app;