"use strict";
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const request = require("request");
//const multer = require('multer');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require("axios").default;
const mongoose = require("mongoose");
const appRoot = require('app-root-path');
const handlebars = require('handlebars');
const fs = require('fs');
const Path = require('path');
const FormData = require('form-data');

// tiledesk clients
const { TiledeskClient } = require('@tiledesk/tiledesk-client');
const { TiledeskWhatsappTranslator } = require('./tiledesk/TiledeskWhatsappTranslator');
const { TiledeskSubscriptionClient } = require('./tiledesk/TiledeskSubscriptionClient');
const { WhatsappUtils } = require('./tiledesk/WhatsappUtils');
const { TiledeskChannel } = require('./tiledesk/TiledeskChannel');

// mongo
const { KVBaseMongo } = require('@tiledesk/tiledesk-kvbasemongo');
const kvbase_collection = 'kvstore';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//const TOKEN = process.env.WHATSAPP_TOKEN;        // From FB DevX getting started page
//const VERIFY_TOKEN = process.env.VERIFY_TOKEN;   // Arbitrary, used with webhook configuration in FB DevX
const BASE_URL = process.env.BASE_URL;
const API_URL = process.env.API_URL;
//const project_id = process.env.PROJECT_ID;
//const token_jwt = process.env.TOKEN_JWT
const GRAPH_URL = process.env.GRAPH_URL;
const MONGODB_URL = process.env.MONGODB_URL;

const log = false;

var subscription;

const db = new KVBaseMongo(kvbase_collection);

db.connect(MONGODB_URL, () => {
  console.log("KVBaseMongo successfully connected.");
  var server = app.listen(process.env.PORT || 1337, function() {
    var port = server.address().port;
    console.log("App now running on port", port);
  });
})

app.get('/', async (req, res) => {
  console.log("Setting up...");
  res.send('Home works!')
})

app.get('/configure', async (req, res) => {
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

app.post('/update', async (req, res) => {
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

    const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, token: token, log: false })

    const data = {
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
    tdClient.subscribe(projectId, data).then((data) => {
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

app.post('\n/disconnect', async (req, res) => {
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

  const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, token: token, log: false })

  /*
  // callback
  tdClient.unsubsribe(projectId, subscriptionId, (err, data) => {
    // code here
  })
  */

  tdClient.unsubscribe(projectId, subscriptionId).then((data) => {

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

app.post('/tiledesk', async (req, res) => {

  console.log("\n/tiledesk")
  console.log("/tiledesk tiledeskChannelMessage: ", req.body.payload);
  if (log) {
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

  let phone_number_id = recipient_id.substring(recipient_id.lastIndexOf("wab-") + 4, last);
  console.log("(Tiledesk) phone_number_id: ", phone_number_id)

  const tlr = new TiledeskWhatsappTranslator({ channelMessage: tiledeskChannelMessage });

  const whatsappJsonMessage = tlr.toWhatsapp(whatsapp_receiver);
  console.log("whatsappJsonMessage: ", whatsappJsonMessage);

  if (whatsappJsonMessage) {
    sendMessage(phone_number_id, whatsappJsonMessage, wab_token).then((response) => {
      console.log("sendMessage() response: ", response);
    }).catch((err) => {
      console.log("ERROR sendMessage(): ", err);
    })
  }
  // richiamo toWhatsapp;
  // sendMessage
  //callSendAPI(project_id, phone_number_id, to, payload);
  return res.send(200);
})

// Endpoint for Whatsapp Business
// Accepts POST requests at /webhook endpoint
app.post("/webhook/:project_id", async (req, res) => {
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
        const util = new WhatsappUtils({ token: settings.wab_token, GRAPH_URL: GRAPH_URL })

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
app.get("/webhook/:project_id", async (req, res) => {
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

// !!!!!!! Move this. Where?
function sendMessage(phone_number_id, data, TOKEN) {

  let promise = new Promise((resolve, reject) => {
    request({
      method: "POST", // Required, HTTP method, a string, e.g. POST, GET
      url: "https://graph.facebook.com/v12.0/" + phone_number_id + "/messages?access_token=" + TOKEN,
      json: data,
      headers: { "Content-Type": "application/json" },
    }, (err, res, resbody) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log("resbody: ", resbody);
        console.log("Message sent to WhatsApp!");
        resolve(true);
      }
    });
  })
  return promise;
}


function readHTMLFile(templateName, callback) {
  console.log("Reading file: ", templateName)
  fs.readFile(appRoot + '/template/' + templateName, { encoding: 'utf-8' },
    function(err, html) {
      if (err) {
        throw err;
        callback(err);
      } else {
        callback(null, html)
      }
    })
}

/*
NO LONGER USED --> TO DELETE

////////////////////////////////////////////////////////////////////////////////////////////////////////

function subscribeWebhookTiledesk(project_id, token_jwt) {

  const data = {
    target: BASE_URL + "/tiledesk",
    event: 'message.create.request.channel.whatsapp'
  }

  let promise = new Promise((resolve, reject) => {
    request({
      url: API_URL + `/${project_id}/subscriptions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token_jwt
      },
      json: data,
      method: 'POST'
    }, (err, res, resbody) => {

      if (err) {
        reject("Error Tiledesk Subscription: ", err);
      } else if (resbody.success == false) {
        reject("Resbody Success: False");
      } else {
        console.log("Tiledesk Subscription Resbody: \n", resbody);

        subscription = {
          subscriptionId: resbody._id,
          secret: resbody.secret
        }
        console.log("Subscription: ", subscription);
        resolve(subscription);
      }
    })
  })
  return promise;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function unsubscribeWebhookTiledesk(projectId, token, subscriptionId) {
  let promise = new Promise((resolve, reject) => {

    request({
      url: API_URL + `/${projectId}/subscriptions/${subscriptionId}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      method: 'DELETE'
    }, (err, res, resbody) => {
      if (err) {
        reject("Error Tiledesk Unsubscription: ", err)
      } else if (resbody.success == false) {
        reject("Resbody success: False")
      } else {
        console.log("Unsubscribed: ", resbody);
        resolve(true);
      }
    })
  })
  return promise;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function createMsg(message, from) {
  let promise = new Promise((resolve, reject) => {
    console.log("(CreateMsg) message: ", message);

    if (message.type == 'text') {
      // Message Text Only
      var msg = {
        text: message.text.body,
        senderFullname: from,
        channel: { name: "whatsapp" }
      }
      resolve(msg);

    } else if (message.type == 'interactive') {
      // Message Callback
      // List Reply
      if (message.interactive.type == "list_reply") {
        if (message.interactive.list_reply.id.startsWith("action_")) {
          // Action Button
          var msg = {
            senderFullname: from,
            text: 'text',
            type: 'text',
            attributes: {
              action: message.interactive.list_reply.id.substring(7),
              subtype: 'info'
            },
            channel: { name: "whatsapp" }
          }
          resolve(msg);

        } else {
          // Quick reply
          var msg = {
            text: message.interactive.list_reply.title,
            senderFullname: from,
            channel: { name: "whatsapp" }
          }
          resolve(msg)
        }
      }

      // Button Reply
      if (message.interactive.type == "button_reply") {
        if (message.interactive.button_reply.id.startsWith("action_")) {
          // Action Button
          var msg = {
            senderFullname: from,
            text: 'text',
            type: 'text',
            attributes: {
              action: message.interactive.button_reply.id.substring(7),
              subtype: 'info'
            },
            channel: { name: "whatsapp" }
          }
          resolve(msg);

        } else {
          // Quick reply
          var msg = {
            text: message.interactive.button_reply.title,
            senderFullname: from,
            channel: { name: "whatsapp" }
          }
          resolve(msg)
        }
      }

    } else if (message.type == 'image') {
      // Message with image
      let mediaId = message.image.id;

      request({
        url: GRAPH_URL + mediaId,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + TOKEN
        }
      }, (err, res, resbody) => {
        if (err) {
          console.log("Error getting image url from Whatsapp")
        } else {
          let resbody_parsed = JSON.parse(resbody)

          let download_url = resbody_parsed.url;
          console.log("Image Url: ", download_url);

          let mime_type = message.image.mime_type;
          let extension = mime_type.substring(mime_type.lastIndexOf("/") + 1);
          let type = "image." + extension;

          download(download_url, type).then((response) => {

            let path = "tmp/" + type;

            uploadFile(path, "images").then((uploadResponse) => {
              console.log("uploadResponse: ", uploadResponse.data);

              let image_url = "https://tiledesk-server-pre.herokuapp.com/images/?path=" + uploadResponse.data.filename;
              console.log("imageUrl: ", image_url);

              let text = "Image attached";
              // Check if message contain a caption
              if (message.image.caption) {
                text = message.image.caption;
              }

              var msg = {
                text: text,
                senderFullname: from,
                channel: { name: "whatsapp" },
                type: "image",
                metadata: {
                  src: image_url,
                }
              }
              resolve(msg)

            }).catch((err) => {
              console.log("uploadError: ", err);
            })
          }).catch((err) => {
            console.log("donwload err: ", err);
          })

        }
      })

    } else if (message.type == 'video') {
      // Message with video
      let mediaId = message.video.id;

      request({
        url: GRAPH_URL + mediaId,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + TOKEN
        }
      }, (err, res, resbody) => {

        if (err) {
          console.log("Error getting video url from Whatsapp")
        } else {
          let resbody_parsed = JSON.parse(resbody)
          console.log("resbody_parsed: ", resbody_parsed)

          let download_url = resbody_parsed.url;
          console.log("Video Url: ", download_url);

          let mime_type = message.video.mime_type;
          let extension = mime_type.substring(mime_type.lastIndexOf("/") + 1);
          let type = "video." + extension;

          download(download_url, type).then((response) => {

            console.log("download response: ", response);

            let path = "tmp/" + type;


            console.log("Then call uploadFile....")

            uploadFile(path, "files").then((uploadResponse) => {
              console.log("uploadResponse: ", uploadResponse.data);

              let video_url = "https://tiledesk-server-pre.herokuapp.com/files/download?path=" + uploadResponse.data.filename;
              console.log("video_url: ", video_url);

              let text = "Video attached";

              var msg = {
                text: "[Download video](" + video_url + ")",
                senderFullname: from,
                channel: { name: "whatsapp" },
                type: "file",
                metadata: {
                  name: "video.mp4",
                  type: "video/mp4",
                  src: video_url,
                }
              }
              resolve(msg)
            }).catch((err) => {
              console.log("upload err: ", err);
            })

          }).catch((err) => {
            console.log("donwload err: ", err);
          })
        }

      })

    } else if (message.type == 'document') {
      // Message with Documents
      let mediaId = message.document.id;

      request({
        url: GRAPH_URL + mediaId,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + TOKEN
        }
      }, (err, res, resbody) => {
        if (err) {
          console.log("Error getting document url from Whatsapp")
        } else {
          let resbody_parsed = JSON.parse(resbody)
          console.log("resbody_parsed: ", resbody_parsed);

          let download_url = resbody_parsed.url;
          console.log("Document Url: ", download_url);

          let mime_type = message.document.mime_type;
          let extension = mime_type.substring(mime_type.lastIndexOf("/") + 1);
          let type = "document." + extension;

          download(download_url, type).then((response) => {

            console.log("download response: ", response);

            let path = "tmp/" + type;
            console.log("[Download completed]");

            uploadFile(path, "files").then((uploadResponse) => {
              console.log("uploadResponse: ", uploadResponse.data);

              let document_url = "https://tiledesk-server-pre.herokuapp.com/files/download?path=" + uploadResponse.data.filename;
              console.log("document_url: ", document_url);

              var msg = {
                text: "[Dowload document](" + document_url + ")",
                senderFullname: from,
                channel: { name: "whatsapp" },
                type: "file",
                metadata: {
                  name: "document.pdf",
                  type: "application/pdf",
                  src: document_url
                }
              }
              resolve(msg);
            }).catch((err) => {
              console.log("upload err: ", err);
            })
          })
        }
      })
    }
  })
  return promise;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function callSendAPI(project_id, phone_number_id, to, payload) {

  // payload <---> channelMessage

  const tlr = new TiledeskWhatsappTranslator({tiledeskChannelMessage: payload});

  const whatsappJsonMessage = tlr.toWhatsapp(to);
  console.log("whatsappJsonMessage: ", whatsappJsonMessage);

}

////////////////////////////////////////////////////////////////////////////////////////////////////////

async function download(download_url, type) {

  const writeStream = fs.createWriteStream('tmp/' + type)
  console.log("[Downloading file...]");

  return await axios({
    url: download_url,
    method: 'GET',
    headers: {
      'Authorization': "Bearer " + TOKEN
    },
    responseType: 'stream'
  }).then((response) => {

    return new Promise((resolve, reject) => {
      response.data.pipe(writeStream);
      let error = null;
      writeStream.on('error', err => {
        error = err;
        writeStream.close();
        console.log("[Download failed]")
        reject(err);
      });
      writeStream.on('close', () => {
        if (!error) {
          console.log("[Download completed]")
          resolve(true);
        }
      })
    })
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function uploadFile(path, type) {

  let url = API_URL_PRE + "/" + type + "/public";
  console.log("[Uploading file...]");

  const form = new FormData();
  form.append('file', fs.createReadStream(path));
  const request_config = {
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    header: {
      ...form.getHeaders()
    }
  }
  return axios.post(url, form, request_config);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function callSendAPI_old(project_id, phone_number_id, to, payload) {

  let text = payload.text.replace(/-{1,}/g, '');
  text = text.replace(/\*{2,}/g, '*')
  console.log("Text: ", text);

  let data = {
    messaging_product: "whatsapp",
    to: to,
  }

  if (payload.metadata) {

    if (payload.metadata.type) {

      if (payload.metadata.type.startsWith('image/')) {
        var imgUrl = payload.metadata.src;
        data.type = 'image'
        data.image = {
          link: imgUrl,
          caption: text
        }

        console.log("Message with image: ", data);

        sendMessage(phone_number_id, data).then((response) => {
          console.log("SendMessage RESPONSE: ", response)
        }).catch((err) => {
          console.log("Error SendMessage: ", err);
        })

      } else if (payload.metadata.type.startsWith('video/')) {

        var videoUrl = payload.metadata.src;

        //data.type = 'video'
        //data.video = {
        //  link: videoUrl,
        //  caption: text
        //}

        data.type = 'document'
        data.document = {
          link: videoUrl,
          caption: text
        }

        console.log("Message with video: ", data);

        sendMessage(phone_number_id, data).then((response) => {
          console.log("SendMessage RESPONSE: ", response)
        }).catch((err) => {
          console.log("Error SendMessage: ", err);
        })

      } else if (payload.metadata.type.startsWith('application/')) {

        var doc = payload.metadata.src;
        data.type = 'document'
        data.document = {
          link: doc,
          caption: text
        }

        console.log("Message with document: ", data);

        sendMessage(phone_number_id, data).then((response) => {
          console.log("SendMessage RESPONSE: ", response)
        }).catch((err) => {
          console.log("Error SendMessage: ", err);
        })

      } else {
        console.log("\nmetadata not recognized");
      }

    } else {
      console.log("Skip message to Whatsapp -> payload.metadata without type");
    }

  } else if (payload.attributes) {
    if (payload.attributes.attachment) {
      if (payload.attributes.attachment.buttons) {

        // message contain buttons
        let buttons = payload.attributes.attachment.buttons;
        console.log("Buttons: ", buttons);

        let quick_replies = [];
        let option_rows = [];
        let action_rows = [];
        console.log("number of buttons: ", buttons.length)

        let buttons_count = 0;
        for (let btn of buttons) {
          if (btn.type != 'url') {
            buttons_count = buttons_count + 1;
          }
        }

        if (buttons_count < 4) {
          console.log("Less than 3 buttons -> Use quick replies")
          let idx = 0;
          for (let btn of buttons) {

            let title = (btn.value.length > 20) ? btn.value.substr(0, 18) + '..' : btn.value;
            console.log("row title: " + title + " --> " + title.length)

            if (btn.type == 'text') {

              let text_btn = {
                type: "reply",
                reply: {
                  id: "quick_" + idx,
                  title: title
                }
              }
              quick_replies.push(text_btn);
              idx = idx + 1;
            }

            if (btn.type == 'action') {
              let action_btn = {
                type: "reply",
                reply: {
                  id: "action_" + btn.action,
                  title: title
                }
              }
              quick_replies.push(action_btn);
              idx = idx + 1;
            }

            if (btn.type == 'url') {
              text = text + "\n\n👉 " + btn.value + " (" + btn.link + ")"
            }
          }

          data.type = "interactive";
          data.interactive = {
            type: "button",
            body: {
              text: text
            },
            action: {
              buttons: quick_replies
            }
          };

          sendMessage(phone_number_id, data).then((response) => {
            console.log("SendMessage RESPONSE: ", response)
          }).catch((err) => {
            console.log("Error SendMessage: ", err);
          })

        } else if (buttons_count > 3 && buttons_count < 11) {
          console.log("More than 3 buttons -> Use list")
          let idx = 0;
          for (let btn of buttons) {

            let title = (btn.value.length > 24) ? btn.value.substr(0, 22) + '..' : btn.value;
            console.log("row title: " + title + " --> " + title.length)

            // Text button
            if (btn.type == 'text') {
              let row = {
                id: "quick_" + idx,
                title: title
              }
              option_rows.push(row);
              idx = idx + 1;
            }
            // Action button
            if (btn.type == 'action') {
              let row = {
                id: "action_" + btn.action,
                title: title
              }
              action_rows.push(row);
              idx = idx + 1;
            }
            // Url button
            if (btn.type == 'url') {
              text = text + "\n\n👉 " + btn.value + " (" + btn.link + ")"
            }

          }

          data.type = "interactive";
          data.interactive = {
            type: "list",
            body: {
              text: text
            },
            action: {
              button: "Choose an option",
              sections: [
                {
                  title: "Options",
                  rows: option_rows
                },
                {
                  title: "Actions",
                  rows: action_rows
                }
              ]
            }
          }

          sendMessage(phone_number_id, data).then((response) => {
            console.log("SendMessage RESPONSE: ", response)
          }).catch((err) => {
            console.log("Error SendMessage: ", err);
          })

        } else {
          console.log("Too many buttons. Maximum buttons supported: 10")
        }
      }
    } else {

      data.text = { body: text };
      sendMessage(phone_number_id, data).then((response) => {
        console.log("SendMessage RESPONSE: ", response)
      }).catch((err) => {
        console.log("Error SendMessage: ", err);
      })

    }
  } else {
    console.log("Skip message to Whatsapp...")
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads')
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname)
  }
})
var upload = multer({ storage: storage })

////////////////////////////////////////////////////////////////////////////////////////////////////////

function getId() {
  var newTime = Math.floor((new Date()).getTime() / 1000) - 1546300800;//seconds since 01/01/2019
  return newTime.toString(36);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

async function download2(download_url, type) {
  //const path = Path.resolve(__dirname, 'files', 'name')
  const writer = fs.createWriteStream('tmp/' + type)
  console.log("[Downloading file...]")

  console.log("download url: ", download_url)
  const response = await axios({
    url: download_url,
    method: 'GET',
    headers: {
      'Authorization': "Bearer " + TOKEN
    },
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

function uploadImage(path) {

  let url = API_URL_PRE + "/images/public";
  console.log("[Uploading file...]")

  const form = new FormData();
  form.append('file', fs.createReadStream(path));

  const request_config = {
    headers: {
      ...form.getHeaders()
    }
  }
  return axios.post(url, form, request_config);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

async function setSettings(settings) {
  const CONTENT_KEY = 'whatsapp-' + settings.projectId;
  await db.set(CONTENT_KEY, settings);

  return true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

async function getSettings(CONTENT_KEY) {
  const settings = await db.get(CONTENT_KEY);
  console.log("[KVDB] settings: ", settings);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////


function getSubscriptions(project_id, token) {
  let promise = new Promise((resolve, reject) => {
    request({
      url: API_URL + `/${project_id}/subscriptions`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      methos: 'GET'
    }, (err, res, resbody) => {
      if (err) {
        reject("[ERROR] Get Tiledesk Subscriptions: ", err);
      } else if (resbody.success == false) {
        reject("Resbody Success: False");
      } else {
        let parsed_resbody = JSON.parse(resbody);
        console.log("Tiledesk Subscription Resbody: \n", parsed_resbody);

        for (let sub of parsed_resbody) {
          if (sub.event == 'message.create.request.channel.whatsapp') {
            resolve(true);
          }
        }
        resolve(false);
      }
    })
  })
  return promise;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

app.post('/disconnect_old', async (req, res) => {
  console.log("Disconnect req.body: ", req.body);

  let projectId = req.body.project_id;
  let token = req.body.token;
  let subscriptionId = req.body.subscription_id;

  let CONTENT_KEY = "whatsapp-" + projectId;

  let proxy_url = BASE_URL + "/webhook/" + projectId;
  console.log("proxy_url: ", proxy_url);


  await db.remove(CONTENT_KEY);
  console.log("Content deleted.");



  unsubscribeWebhookTiledesk(projectId, token, subscriptionId).then((response) => {
    console.log("Unsubscribed: ", response);

    readHTMLFile('/configure.html', (err, html) => {

      if (err) {
        console.log("[ERROR] Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
      }
      console.log("Replacements: ", replacements);
      var html = template(replacements);
      res.send(html);
    })
  })
})

*/


