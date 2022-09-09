require('dotenv').config();
const express = require('express');
const app = express();

const whatsapp = require('@tiledesk/tiledesk-whatsapp-connector');
//const whatsapp = require('./whatsappRoute');
const whatsappRoute = whatsapp.router;

app.use("/", whatsappRoute)

const BASE_URL = process.env.BASE_URL;
const API_URL = process.env.API_URL;
const GRAPH_URL = process.env.GRAPH_URL;
const MONGODB_URL = process.env.MONGODB_URL;
const log = false;

whatsapp.startApp(
  {
    MONGODB_URL: MONGODB_URL,
    API_URL: API_URL,
    GRAPH_URL: GRAPH_URL,
    BASE_URL: BASE_URL,
    log: log
  }, () => {
    console.log("Whatsapp route succesfully started.")
    var port = process.env.PORT || 3000;
    app.listen(port, function() {
      console.log("Whatsapp connector listening on port: ", port);
    })
  }
);
