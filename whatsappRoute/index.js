"use strict";
const express = require("express");
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
//const request = require("request");
//const multer = require('multer');
//const jwt = require('jsonwebtoken');
//const { v4: uuidv4 } = require('uuid');
//const axios = require("axios").default;
//const mongoose = require("mongoose");
const appRoot = require('app-root-path');
const handlebars = require('handlebars');
const fs = require('fs');
//const Path = require('path');
//const FormData = require('form-data');

// tiledesk clients
const { TiledeskClient } = require('@tiledesk/tiledesk-client');
const { TiledeskWhatsappTranslator } = require('./tiledesk/TiledeskWhatsappTranslator');
const { TiledeskSubscriptionClient } = require('./tiledesk/TiledeskSubscriptionClient');
const { TiledeskWhatsapp } = require('./tiledesk/TiledeskWhatsapp');
const { TiledeskChannel } = require('./tiledesk/TiledeskChannel');

// mongo
const { KVBaseMongo } = require('@tiledesk/tiledesk-kvbasemongo');
const kvbase_collection = 'kvstore';

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

//const TOKEN = process.env.WHATSAPP_TOKEN;        // From FB DevX getting started page
//const VERIFY_TOKEN = process.env.VERIFY_TOKEN;   // Arbitrary, used with webhook configuration in FB DevX
//const BASE_URL = process.env.BASE_URL;
//const API_URL = process.env.API_URL;
//const project_id = process.env.PROJECT_ID;
//const token_jwt = process.env.TOKEN_JWT
//const GRAPH_URL = process.env.GRAPH_URL;
//const MONGODB_URL = process.env.MONGODB_URL;


var API_URL = null;
var GRAPH_URL = null;
var BASE_URL = null;
var log = false;

const db = new KVBaseMongo(kvbase_collection);
/*
db.connect(MONGODB_URL, () => {
  console.log("KVBaseMongo successfully connected.");
  var server = app.listen(process.env.PORT || 1337, function() {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
})
*/

router.get('/', async (req, res) => {
  res.send('Home works!')
})

router.get('/configure', async (req, res) => {
  console.log("\n/configure");
  if (log) {
    console.log("/configure query: ", req.query);
  }

  let projectId = "";
  let token = "";

  projectId = req.query.project_id;
  token = req.query.token

  let CONTENT_KEY = "whatsapp-" + projectId;

  let settings = await db.get(CONTENT_KEY);
  console.log("[KVDB] settings: ", settings);

  let proxy_url = BASE_URL + "/webhook/" + projectId;
  console.log("proxy_url: ", proxy_url);

  if (settings) {

    readHTMLFile('/configure.html', (err, html) => {
      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        wab_token: settings.wab_token,
        verify_token: settings.verify_token,
        subscription_id: settings.subscriptionId,
      }
      if (log) {
        console.log("Replacements: ", replacements);
      }
      var html = template(replacements);
      res.send(html);

    })

  } else {

    readHTMLFile('/configure.html', (err, html) => {

      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
      }
      if (log) {
        console.log("Replacements: ", replacements);
      }
      var html = template(replacements);
      res.send(html);

    })
  }
})

router.post('/update', async (req, res) => {
  console.log("\n/update");
  if (log) {
    console.log("/update body: ", req.body);
  }

  let projectId = req.body.project_id;
  let token = req.body.token;
  let wab_token = req.body.wab_token;
  let verify_token = req.body.verify_token;

  let CONTENT_KEY = "whatsapp-" + projectId;
  let settings = await db.get(CONTENT_KEY);

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  if (settings) {

    settings.wab_token = wab_token;
    settings.verify_token = verify_token;

    await db.set(CONTENT_KEY, settings);

    readHTMLFile('/configure.html', (err, html) => {
      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        wab_token: settings.wab_token,
        verify_token: settings.verify_token,
        subscription_id: settings.subscriptionId,
      }
      if (log) {
        console.log("Replacements: ", replacements);  
      }
      
      var html = template(replacements);
      res.send(html);
    })

  } else {

    const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, project_id: projectId, token: token, log: false })

    const subscription_info = {
      target: BASE_URL + "/tiledesk",
      event: 'message.create.request.channel.whatsapp'
    }

    /*
    // callback
    await tdClient.subscribe(projectId, data, (err, data) => {
      // code here
    }) 
    */

    // promise
    tdClient.subscribe(subscription_info).then((data) => {
      let subscription = data;
      if (log) {
        console.log("\nSubscription: ", subscription)  
      }
      
      let settings = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        subscriptionId: subscription._id,
        secret: subscription.secret,
        wab_token: wab_token,
        verify_token: verify_token,
      }

      db.set(CONTENT_KEY, settings)
      //let cnt = db.get(CONTENT_KEY);

      readHTMLFile('/configure.html', (err, html) => {
        if (err) {
          console.log("(ERROR) Read html file: ", err);
        }

        var template = handlebars.compile(html);
        var replacements = {
          project_id: projectId,
          token: token,
          proxy_url: proxy_url,
          wab_token: settings.wab_token,
          verify_token: settings.verify_token,
          subscription_id: settings.subscriptionId,
        }
        if (log) {
          console.log("Replacements: ", replacements);  
        }
        
        var html = template(replacements);
        res.send(html);
      })

    }).catch((err) => {
      console.log("\n (ERROR) Subscription: ", err)
    })

  }
})

router.post('\n/disconnect', async (req, res) => {
  console.log("/disconnect")
  if (log) {
    console.log("/disconnect body: ", req.body)  
  }

  let projectId = req.body.project_id;
  let token = req.body.token;
  let subscriptionId = req.body.subscription_id;

  let CONTENT_KEY = "whatsapp-" + projectId;
  await db.remove(CONTENT_KEY);
  console.log("Content deleted.");

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, project_id: projectId, token: token, log: false })

  /*
  // callback
  tdClient.unsubsribe(projectId, subscriptionId, (err, data) => {
    // code here
  })
  */

  tdClient.unsubscribe(subscriptionId).then((data) => {

    readHTMLFile('/configure.html', (err, html) => {

      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
      }
      if (log) {
        console.log("Replacements: ", replacements);  
      }
      
      var html = template(replacements);
      res.send(html);
    })

  }).catch((err) => {
    console.error("(ERROR) Unsubscribe: ", err);
  })

})

router.post('/tiledesk', async (req, res) => {

  console.log("\n/tiledesk")
  if (log) {
    console.log("/tiledesk tiledeskChannelMessage: ", req.body.payload);
  }

  var tiledeskChannelMessage = req.body.payload;
  //console.log("(TILEDESK) Payload: ", JSON.stringify(req.body.payload));

  var projectId = req.body.payload.id_project;
  console.log("(TILEDESK) PROJECT ID: ", projectId);

  // get settings from mongo
  let CONTENT_KEY = "whatsapp-" + projectId;
  let settings = await db.get(CONTENT_KEY);
  let wab_token = settings.wab_token;

  var text = req.body.payload.text;
  console.log("(TILEDESK) TEXT: ", text);

  var attributes = req.body.payload.attributes;
  console.log("(TILEDESK) ATTRIBUTES: ", attributes)

  var sender_id = req.body.payload.sender;
  console.log("(TILEDESK) SENDER ID: ", sender_id);

  if (sender_id.indexOf("wab") > -1) {
    console.log("Skip same sender");
    return res.send(200);
  }

  if (attributes && attributes.subtype === "info") {
    console.log("(TILEDESK) Skip subtype (info) ");
    return res.send(200);
  }

  let recipient_id = tiledeskChannelMessage.recipient;
  console.log("(Tiledesk) Recipient_id: ", recipient_id);

  //let last = recipient_id.lastIndexOf("-");

  let whatsapp_receiver = recipient_id.substring(recipient_id.lastIndexOf("-") + 1);
  console.log("(Tiledesk) whatsapp_receiver: ", whatsapp_receiver);

  //let last2 = recipient_id.lastIndexOf("wab-");

  let phone_number_id = recipient_id.substring(recipient_id.lastIndexOf("wab-") + 4, recipient_id.lastIndexOf("-"));
  console.log("(Tiledesk) phone_number_id: ", phone_number_id)

  const tlr = new TiledeskWhatsappTranslator({ channelMessage: tiledeskChannelMessage });

  const whatsappJsonMessage = tlr.toWhatsapp(whatsapp_receiver);
  console.log("whatsappJsonMessage: ", whatsappJsonMessage);

  if (whatsappJsonMessage) {
    const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });

    twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
      console.log("Send message response: ", response.status, response.statusText);
    }).catch((err) => {
      console.error("ERROR Send message: ", err);
    })

    /*
    sendMessage(phone_number_id, whatsappJsonMessage, wab_token).then((response) => {
      console.log("sendMessage() response: ", response);
    }).catch((err) => {
      console.log("ERROR sendMessage(): ", err);
    })
    */
  } else {
    console.error("Whatsapp Json Message is mandatory!")
  }
  // richiamo toWhatsapp;
  // sendMessage
  //callSendAPI(project_id, phone_number_id, to, payload);
  return res.send(200);
})

// Endpoint for Whatsapp Business
// Accepts POST requests at /webhook endpoint
router.post("/webhook/:project_id", async (req, res) => {
  // Parse the request body from the POST
  let body = req.body;
  let projectId = req.params.project_id;

  // Check the Incoming webhook message
  // console.log("\n***Body: ", JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {

      console.log("\n***Body: ", JSON.stringify(req.body, null, 2));

      //let originalWhatsappMessage = req.body;
      let whatsappChannelMessage = req.body.entry[0].changes[0].value.messages[0];

      let firstname = req.body.entry[0].changes[0].value.contacts[0].profile.name;
      console.log("(WAB) firstname: ", firstname)

      let message_info = {
        channel: "whatsapp",
        whatsapp: {
          phone_number_id: req.body.entry[0].changes[0].value.metadata.phone_number_id,
          from: req.body.entry[0].changes[0].value.messages[0].from,
          firstname: req.body.entry[0].changes[0].value.contacts[0].profile.name,
          lastname: " "
        }
      }

      let CONTENT_KEY = "whatsapp-" + projectId;

      let settings = await db.get(CONTENT_KEY);
      if (log) {
        console.log("[KVDB] settings: ", settings);
      }

      if (!settings) {
        console.log("No settings found. Exit..");
        res.sendStatus(200);
        return;
      }

      let tiledeskJsonMessage;

      const tlr = new TiledeskWhatsappTranslator({ channelMessage: whatsappChannelMessage });

      if ((whatsappChannelMessage.type == 'text')) {
        console.log("message type text")
        tiledeskJsonMessage = tlr.toTiledesk(firstname);

      }
      else if (whatsappChannelMessage.type == 'interactive') {
        console.log("message type interactive")
        tiledeskJsonMessage = tlr.toTiledesk(firstname);

      }
      else if ((whatsappChannelMessage.type == 'image') || (whatsappChannelMessage.type == 'video') || (whatsappChannelMessage.type == 'document')) {
        let media;
        const util = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL })

        if (whatsappChannelMessage.type == 'image') {
          media = whatsappChannelMessage.image;
          console.log("media_id: ", media.id);

          const filename = await util.downloadMedia(media.id);
          console.log("File position: ", filename);

          const image_url = await util.uploadMedia(filename, "images");
          console.log("image_url: ", image_url)

          tiledeskJsonMessage = tlr.toTiledesk(firstname, image_url);

        }

        if (whatsappChannelMessage.type == 'video') {
          media = whatsappChannelMessage.video;

          const filename = await util.downloadMedia(media.id);
          console.log("File position: ", filename);

          const media_url = await util.uploadMedia(filename, "files");
          console.log("image_url: ", media_url)

          tiledeskJsonMessage = tlr.toTiledesk(firstname, media_url);
        }

        if (whatsappChannelMessage.type == 'document') {
          media = whatsappChannelMessage.document;

          const filename = await util.downloadMedia(media.id);
          console.log("File position: ", filename);

          const media_url = await util.uploadMedia(filename, "files");
          console.log("image_url: ", media_url)

          tiledeskJsonMessage = tlr.toTiledesk(firstname, media_url);
        }

      } else {
        // unsupported. Try anyway to send something.
      }

      console.log("tiledeskJsonMessage: ", tiledeskJsonMessage);

      // tdClient.signInWithCustomToken
      // tdClient.getRequests 
      const tdChannel = new TiledeskChannel({ settings: settings, API_URL: API_URL })
      const response = await tdChannel.send(tiledeskJsonMessage, message_info);
      if (log) {  
        console.log("Send response: ", response)
      }

    }
    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests 
router.get("/webhook/:project_id", async (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  let CONTENT_KEY = "whatsapp-" + req.params.project_id;

  let settings = await db.get(CONTENT_KEY);

  if (!settings || !settings.verify_token) {
    console.error("No settings found! Unable to verify token.")
    res.sendStatus(403);
  } else {
    let VERIFY_TOKEN = settings.verify_token;

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        // Respond with 200 OK and challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }

  }

});


// *****************************
// ********* FUNCTIONS *********
// *****************************

function startApp(settings, callback) {
  console.log("Starting Whatsapp App");

  if (!settings.MONGODB_URL) {
    throw new Error("settings.MONGODB_URL is mandatory");
  }
  
  if (!settings.API_URL) {
    throw new Error("settings.API_URL is mandatory");
  } else {
    API_URL = settings.API_URL;
    console.log("API_URL: ", API_URL);
  }

  if (!settings.BASE_URL) {
    throw new Error("settings.BASE_URL is mandatory");
  } else {
    BASE_URL = settings.BASE_URL;
    console.log("BASE_URL: ", BASE_URL);
  }

  if (!settings.GRAPH_URL) {
    throw new Error("settings.GRAPH_URL is mandatory");
  } else {
    GRAPH_URL = settings.GRAPH_URL;
    console.log("GRAPH_URL: ", GRAPH_URL);
  }

  if (settings.log) {
    log = settings.log;
  }

  db.connect(settings.MONGODB_URL, () => {
    console.log("KVBaseMongo successfully connected.");
    if (callback) {
      callback();
    }
  })
}

function readHTMLFile(templateName, callback) {
  console.log("Reading file: ", templateName)
  fs.readFile(appRoot.path + '/template' + templateName, { encoding: 'utf-8' },
    function(err, html) {
      if (err) {
        throw err;
        //callback(err);
      } else {
        callback(null, html)
      }
    })
}

module.exports = { router: router, startApp: startApp};