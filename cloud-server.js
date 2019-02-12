const shell = require('shelljs');
const express = require('express')
const app = express()
const bodyParser = require('body-parser');
const port = 8910
const util = require(__dirname + '/core/util');
//const config = util.getConfig();
const dirs = util.dirs();
const _ = require('lodash');
const fs = require('fs');
const async = require('async');
const moment = require('moment');
var configRead = fs.readFileSync('./config.js','utf8');
const replaceString = require('replace-string');
const pm2 = require("pm2");

var pm2list = []
app.use(express.json());

app.post('/genconfig', function (req, res) {
   
   
   var configReadData = configRead;
   var currency = req.body.currency;
   var asset = req.body.asset;
   var size = (req.body.size !== undefined ? req.body.size : "1");
   var history = (req.body.history !== undefined ? req.body.history : "60");

   var valPrices = (req.body.valPrices !== undefined ? req.body.valPrices : '1');
   var valProfit = (req.body.valProfit !== undefined ? req.body.valProfit : '1.75');
   var TradeLimit = (req.body.TradeLimit !== undefined ? req.body.TradeLimit : '0.1');
   var apiReportKey = (req.body.apiReportKey !== undefined ? req.body.apiReportKey : "");
   var method = (req.body.methodAI !== undefined ? req.body.methodAI : "BNB_Trader");
   var market24h = (req.body.market24h !== undefined && req.body.market24h > 0 ? "true" : "false");
   var detachbuy = (req.body.detachbuy !== undefined && req.body.detachbuy > 0 ? "true" : "false");
   var stoplost = (req.body.stoplost !== undefined ? req.body.stoplost : "0");

   //var data = JSON.stringify(config);
   //console.log(valPrices);
   configReadData = replaceString(configReadData,"{currency}",currency);
   configReadData = replaceString(configReadData,"{asset}",asset);
   configReadData = replaceString(configReadData,'{size}',size);
   configReadData = replaceString(configReadData,'{history}',history);
   configReadData = replaceString(configReadData,'{market24h}',market24h);
   configReadData = replaceString(configReadData,'{detachbuy}',detachbuy);
   configReadData = replaceString(configReadData,'{stoplost}',stoplost);


   configReadData = replaceString(configReadData,'{method}',method);
   configReadData = replaceString(configReadData,'{valPrices}',valPrices);
   configReadData = replaceString(configReadData,"{valProfit}",valProfit);
   configReadData = replaceString(configReadData,"{TradeLimit}",TradeLimit);
   configReadData = replaceString(configReadData,"{apiReportKey}","'"+apiReportKey+"'");


   fs.writeFile(asset+currency+'-config.js', configReadData, function (err) {
	    if (err) 
	        return console.log(err);
	    console.log('Config ',asset+currency);
	});

   res.end("");
});

/*
Created Start or Stop Trader
*/

app.post('/task', function (req, res) {
   var cmd = req.body.cmd;
   var currency = req.body.currency;
   var asset = req.body.asset;
   var fileConfig = asset+currency+"-config.js";

   if(cmd === "start"){
      if(shell.exec('pm2 start gekko.js -n "'+asset+currency+'" -- -c '+fileConfig).code !== 0){
         res.send(JSON.stringify({status: true}));
      }
   }else if(cmd === "restart"){
      if(shell.exec('pm2 restart "'+asset+currency+'"').code !== 0){
         res.send(JSON.stringify({status: true}));
      }
   }else if(cmd === "stop"){
      if(shell.exec('pm2 stop "'+asset+currency+'"').code !== 0){
         res.send(JSON.stringify({status: true}));
      }
   }else if(cmd === "delete"){
      if(shell.exec('pm2 delete "'+asset+currency+'"').code !== 0){
         res.send(JSON.stringify({status: true}));
      }
   }else if(cmd === "market24h"){
      if(shell.exec('pm2 start markets.js -n "MARKETS"').code !== 0){
         res.send(JSON.stringify({status: true}));
      }
   }
   res.end("");
});

app.post('/apikeys', function (req, res) {
   var data = '{"binance":{"key":"'+req.body.keys+'","secret":"'+req.body.secret+'"}}';
   fs.writeFile('SECRET-api-keys.json', data, function (err) {
       if (err) 
           return console.log(err);
       console.log('Write api-keys');
   });

   res.end("");
});

app.post("/setstatus", function(req, res){
   var cmd = req.body.cmd;
   var currency = req.body.currency;
   var asset = req.body.asset;

   var filecache = __dirname + "/markets/savedata/" + asset+currency + ".json";
   if (fs.existsSync(filecache)) {
       var readCache = JSON.parse(fs.readFileSync(filecache,"utf8"));
       if(cmd == "restartbuy"){
         readCache.stopbuy == false;
       }

       if(cmd == "restartsell"){
         readCache.stopsell == false;
       }

       if(cmd == "stopbuy"){
         readCache.stopbuy == true;
       }

       if(cmd == "stopsell"){
         readCache.stopsell == true;
       }

       fs.writeFile(filecache, JSON.stringify(readCache), function (err) {
          if (err) 
              return console.log(err);
          console.log('Write api-keys');
      });

      res.send(JSON.stringify({status: true}));
      res.end();
   }
});
app.get("/status", function(req, res){
      var data = [];
      pm2.connect(function(err) {
        
              if (err) {
                  console.error(err);
                  process.exit(0);
                  return;
              }
                  
              

             data.push(new Promise(function (resolve, reject) {
                pm2.list(function(err, process){
                  resolve(process);
                });
              }));

              Promise.all(data).then(function(result){

              return _.first(result);
           
           }).then(function(data){

                var obj = []
                _.forEach(data, function(value, key){
                  var readdata = {};
                  readdata.pid = value.pid;
                  readdata.name = value.name;
                  readdata.status = value.pm2_env.status;
                  obj.push(readdata);
                  
                });
                
                pm2.disconnect();

                return obj;

           }).then(function(data){
              //var filecache = __dirname + "/markets/" + asset+currency + ".json";
              var makeData = [];

              _.forEach(data, function(value, key){
                var filecache = __dirname + "/markets/" + value.name + ".json";
                //var readData = {};

                if (fs.existsSync(filecache)) {
                    value.info = JSON.parse(fs.readFileSync(filecache,"utf8"));
                }

                //console.log(value.name);
                makeData.push(value)
              });
              
              res.send(makeData);
              res.render(makeData);
              res.end();
           });
          
      });
      res.send("ok");
      res.end();
});

/*
app.post("/status", function(req, res){
   var cmd = req.body.cmd;
   var currency = req.body.currency;
   var asset = req.body.asset;
   var data = [];

   if(cmd == "on"){

      pm2.connect(function(err) {
        
              if (err) {
                  console.error(err);
                  process.exit(0);
                  return;
              }
                  
              

             data.push(new Promise(function (resolve, reject) {
                pm2.list(function(err, process){
                  resolve(process);
                });
              }));

              Promise.all(data).then(function(result){

              return _.first(result);
           
           }).then(function(data){

                var obj = []
                _.forEach(data, function(value, key){
                  var readdata = {};
                  readdata.pid = value.pid;
                  readdata.name = value.name;
                  readdata.status = value.pm2_env.status;
                  obj.push(readdata);
                  
                });
                
                pm2.disconnect();

                return obj;

           }).then(function(data){

              pm2list = data;
              
           });
          
      });

     
      var filecache = __dirname + "/markets/" + asset+currency + ".json";
      var _fixData = _.filter(pm2list, {name: asset+currency});
      console.log(pm2list);
      if (fs.existsSync(filecache)) {
          res.send(fs.readFileSync(filecache,"utf8"));
      }
      res.send(JSON.stringify({status: false}));
   }


   if(cmd == "log"){
      res.send(JSON.stringify({status: true}));
   }


});
*/
var server = app.listen(port, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
})