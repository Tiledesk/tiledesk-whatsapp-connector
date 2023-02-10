"use strict";
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const appRoot = require('app-root-path');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const pjson = require('./package.json');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

// tiledesk clients
const { TiledeskClient } = require('@tiledesk/tiledesk-client');
const { TiledeskWhatsappTranslator } = require('./tiledesk/TiledeskWhatsappTranslator');
const { TiledeskSubscriptionClient } = require('./tiledesk/TiledeskSubscriptionClient');
const { TiledeskWhatsapp } = require('./tiledesk/TiledeskWhatsapp');
const { TiledeskChannel } = require('./tiledesk/TiledeskChannel');
const { TiledeskAppsClient } = require('./tiledesk/TiledeskAppsClient');
const { MessageHandler } = require('./tiledesk/MessageHandler');

// mongo
const { KVBaseMongo } = require('@tiledesk/tiledesk-kvbasemongo');
const kvbase_collection = 'kvstore';
const db = new KVBaseMongo(kvbase_collection);

// redis
var redis = require('redis')
var redis_client;

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static(path.join(__dirname, 'template')));
router.use(cors());

let API_URL = null;
let GRAPH_URL = null;
let BASE_URL = null;
let APPS_API_URL = null;
let REDIS_HOST = null;
let REDIS_PORT = null;
let REDIS_PASSWORD = null;
let log = false;


router.get('/', async (req, res) => {
  res.send('Welcome to Tiledesk-WhatsApp Business connector!')
})

router.get('/detail', async (req, res) => {

  let projectId = req.query.project_id;
  let token = req.query.token;
  let app_id = req.query.app_id;

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  let installation = await appClient.getInstallations(projectId, app_id);

  let installed = false;
  if (installation) {
    installed = true;
  }

  readHTMLFile('/detail.html', (err, html) => {
    if (err) {
      console.log("(ERROR) Read html file: ", err);
    }

    var template = handlebars.compile(html);
    var replacements = {
      app_version: pjson.version,
      project_id: projectId,
      token: token,
      app_id: app_id,
      installed: installed
    }
    if (log) {
      console.log("Replacements: ", replacements);
    }
    var html = template(replacements);
    res.send(html);
  })
})

router.post('/install', async (req, res) => {

  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  console.log("Install app " + app_id + " for project id " + project_id);
  let installation_info = {
    project_id: project_id,
    app_id: app_id,
    createdAt: Date.now()
  };

  console.log("installation info: ", installation_info)

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  //let installation = await appClient.install(installation_info);
  appClient.install(installation_info).then((installation) => {

    if (log) {
      console.log("installation response: ", installation);
    }

    let installed = true;

    readHTMLFile('/detail.html', (err, html) => {
      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        app_id: app_id,
        installed: installed
      }
      if (log) {
        console.log("Replacements: ", replacements);
      }
      var html = template(replacements);
      res.send(html);
    })

  }).catch((err) => {
    console.error("installation error: ", err.data)
    res.send("An error occurred during the installation");
  })

})

router.post('/uninstall', async (req, res) => {
  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  appClient.uninstall(project_id, app_id).then((response) => {

    if (log) {
      console.log("uninstallation response: ", response);
    }

    let installed = false;

    readHTMLFile('/detail.html', (err, html) => {
      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        app_id: app_id,
        installed: installed
      }
      if (log) {
        console.log("Replacements: ", replacements);
      }
      var html = template(replacements);
      res.send(html);
    })

  }).catch((err) => {
    console.error("uninsallation error: ", err.data)
    res.send("An error occurred during the uninstallation");
  })
})

router.get('/configure', async (req, res) => {
  console.log("\n/configure");
  if (log) {
    console.log("/configure query: ", req.query);
  }

  let projectId = "";
  let token = "";

  projectId = req.query.project_id;
  token = req.query.token;

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  let CONTENT_KEY = "whatsapp-" + projectId;
  
  let settings = await db.get(CONTENT_KEY);
  console.log("[KVDB] settings: ", settings);

  if (settings) {

    readHTMLFile('/configure.html', (err, html) => {
      if (err) {
        console.log("(ERROR) Read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
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
        app_version: pjson.version,
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
        app_version: pjson.version,
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        wab_token: settings.wab_token,
        show_success_modal: true,
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
          app_version: pjson.version,
          project_id: projectId,
          token: token,
          proxy_url: proxy_url,
          show_success_modal: true,
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

      readHTMLFile('/configure.html', (err, html) => {
        if (err) {
          console.log("(ERROR) Read html file: ", err);
        }

        var template = handlebars.compile(html);
        var replacements = {
          app_version: pjson.version,
          project_id: projectId,
          token: token,
          proxy_url: proxy_url,
          show_error_modal: true
        }
        if (log) {
          console.log("Replacements: ", replacements);
        }

        var html = template(replacements);
        res.send(html);
      })
    })

  }
})

router.post('/disconnect', async (req, res) => {
  console.log("\n/disconnect")
  if (log) {
    console.log("/disconnect body: ", req.body)
  }

  let projectId = req.body.project_id;
  let token = req.body.token;
  let subscriptionId = req.body.subscription_id;

  console.log("uninstall --> subscriptionId: ", subscriptionId)

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
        app_version: pjson.version,
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
  //if (log) {
  //console.log("/tiledesk ---> tiledeskChannelMessage: " + JSON.stringify(req.body.payload));
  //}

  var tiledeskChannelMessage = req.body.payload;
  console.log("(TILEDESK) Payload: ", JSON.stringify(req.body.payload));

  var projectId = req.body.payload.id_project;
  console.log("(TILEDESK) PROJECT ID: ", projectId);

  // get settings from mongo
  let CONTENT_KEY = "whatsapp-" + projectId;
  let settings = await db.get(CONTENT_KEY);
  let wab_token = settings.wab_token;

  var text = req.body.payload.text;
  console.log("(TILEDESK) TEXT: ", text);

  let attributes = req.body.payload.attributes;
  console.log("(TILEDESK) ATTRIBUTES: ", JSON.stringify(attributes, null, 2))
  if (log) {
  }

  let commands;
  if (attributes && attributes.commands) {
    commands = attributes.commands;
    console.log("commands: ", JSON.stringify(commands, null, 2));
  }

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

  if (attributes && attributes.subtype === 'info/support') {
    console.log("Skip subtype: ", attributes.subtype);
    return res.send(200);
  }

  // Redirect for testing bots
  //if (text.startsWith("#td")) {
  //  return res.redirect('/testitout');
  //}

  //console.log("/tiledesk ---> tiledeskChannelMessage: " + JSON.stringify(req.body.payload));

  let recipient_id = tiledeskChannelMessage.recipient;
  console.log("(Tiledesk) Recipient_id: ", recipient_id);

  //let last = recipient_id.lastIndexOf("-");

  let whatsapp_receiver = recipient_id.substring(recipient_id.lastIndexOf("-") + 1);
  console.log("(Tiledesk) whatsapp_receiver: ", whatsapp_receiver);

  //let last2 = recipient_id.lastIndexOf("wab-");

  let phone_number_id = recipient_id.substring(recipient_id.lastIndexOf("wab-") + 4, recipient_id.lastIndexOf("-"));
  console.log("(Tiledesk) phone_number_id: ", phone_number_id)

  console.log("-----> (Tiledesk) ANSWER: ", tiledeskChannelMessage.answer)

  const messageHandler = new MessageHandler({ tiledeskChannelMessage: tiledeskChannelMessage });
  const tlr = new TiledeskWhatsappTranslator();

  if (commands) {
    const that = this;
    let i = 0;
    async function execute(command) {
      // message
      console.log/("----> next command: ", command);
      if (command.type === "message") {
        let tiledeskCommandMessage = await messageHandler.generateMessageObject(command);
        console.log("message generated!\ntiledeskCommandMessage: ", tiledeskCommandMessage)

        let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskCommandMessage, whatsapp_receiver);
        console.log('\x1b[34m%s\x1b[0m', 'whatsappJsonMessage', whatsappJsonMessage)

        
        if (whatsappJsonMessage) {
        const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });
        twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
            //console.log("Send message response: ", response.status, response.statusText);
            i += 1;
            if (i < commands.length) {
              execute(commands[i]);
            } else {
              console.log("End of commands")
            }
          }).catch((err) => {
            console.error("ERROR Send message: ", err);
          })
        } else {
          console.error("Whatsapp Json Message is undefined!")
        }
        
      }

      //wait
      if (command.type === "wait") {
        setTimeout(() => {
          console.log("wait for " + command.time + " s")
          i += 1;
          if (i < commands.length) {
            execute(commands[i]);
          } else {
            console.log("End of commands")
          }
        }, command.time)
      }
    }
    execute(commands[0]);
  }

  else if (tiledeskChannelMessage.text) {

    console.log("tiledeskChannelMessage.text: ", tiledeskChannelMessage.text)

    let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    console.log('\x1b[34m%s\x1b[0m', 'whatsappJsonMessage', whatsappJsonMessage)
    //console.log("whatsappJsonMessage: ", whatsappJsonMessage);

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
      console.error("Whatsapp Json Message is undefined!")
    }
    
  } else {
    console.log("no command, no text --> skip")
  }


    

  /*
  if (commands) {
    commands.forEach( async (command) => {
      console.log("\ncommand: ", command);
      if (command.type === "message") {
        let tiledeskCommandMessage = await messageHandler.generateMessageObject(command);
        console.log("message generated!\ntiledeskCommandMessage: ", tiledeskCommandMessage)

        let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskCommandMessage, whatsapp_receiver);
        console.log('\x1b[34m%s\x1b[0m', 'whatsappJsonMessage', whatsappJsonMessage)

        
        if (whatsappJsonMessage) {
        const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });
          twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
            console.log("Send message response: ", response.status, response.statusText);
          }).catch((err) => {
            console.error("ERROR Send message: ", err);
          })
        } else {
          console.error("Whatsapp Json Message is undefined!")
        }
        
      }
      if (command.type === "wait") {
        setTimeout(() => {
          console.log("wait for " + command.time + " s")
          console.log("Next command")
        }, command.time)
      }
    })
  }
    */
  //new_tiledesk_message = addCommandmessage(commands[0]);

  /*
  let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
  console.log('\x1b[34m%s\x1b[0m', 'whatsappJsonMessage', whatsappJsonMessage)
  //console.log("whatsappJsonMessage: ", whatsappJsonMessage);

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

  /*
  } else {
    console.error("Whatsapp Json Message is undefined!")
  }
  */
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

      if (req.body.entry[0].changes[0].value.messages[0].type == "system") {
        console.log("Skip system message")
        return res.sendStatus(200);
      }

      //let originalWhatsappMessage = req.body;
      let whatsappChannelMessage = req.body.entry[0].changes[0].value.messages[0];

      if (whatsappChannelMessage.text && whatsappChannelMessage.text.body.startsWith("#td")) { 
        return res.redirect(307, '/testitout/' + projectId);
      }

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

      const tlr = new TiledeskWhatsappTranslator();

      if ((whatsappChannelMessage.type == 'text')) {
        console.log("message type text")
        tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname);

      }
      else if (whatsappChannelMessage.type == 'interactive') {
        console.log("message type interactive")
        tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname);
      }
      else if ((whatsappChannelMessage.type == 'image') || (whatsappChannelMessage.type == 'video') || (whatsappChannelMessage.type == 'document')) {
        let media;
        const util = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL })

        if (whatsappChannelMessage.type == 'image') {
          media = whatsappChannelMessage.image;
          console.log("media_id: ", media.id);

          const filename = await util.downloadMedia(media.id);
          console.log("File position: ", filename);
          if (!filename) {
            console.log("Unable to download media. Message not sent.");
            return res.status(500).send({ success: false, error: "unable to download media" })
          }
          let file_path = path.join(__dirname, 'tmp', filename);

          const image_url = await util.uploadMedia(file_path, "images");
          console.log("image_url: ", image_url)

          tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname, image_url);

        }

        if (whatsappChannelMessage.type == 'video') {
          media = whatsappChannelMessage.video;

          const filename = await util.downloadMedia(media.id);
          console.log("File position: ", filename);
          if (!filename) {
            console.log("Unable to download media. Message not sent.");
            return res.status(500).send({ success: false, error: "unable to download media" })
          }
          let file_path = path.join(__dirname, 'tmp', filename);


          const media_url = await util.uploadMedia(file_path, "files");
          console.log("image_url: ", media_url)

          tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname, media_url);
        }

        if (whatsappChannelMessage.type == 'document') {
          media = whatsappChannelMessage.document;

          const filename = await util.downloadMedia(media.id);
          console.log("File position: ", filename);
          if (!filename) {
            console.log("Unable to download media. Message not sent.");
            return res.status(500).send({ success: false, error: "unable to download media" })
          }
          let file_path = path.join(__dirname, 'tmp', filename);

          const media_url = await util.uploadMedia(file_path, "files");
          console.log("image_url: ", media_url)

          tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname, media_url);
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
  console.log("\nVerify the webhook: ", req);
  console.log("\req.query: ", req.query);

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  console.log("**********")
  console.log("mode: ", mode)
  console.log("token: ", token)
  console.log("challenge: ", challenge)
  console.log("**********")

  let CONTENT_KEY = "whatsapp-" + req.params.project_id;
  console.log("\CONTENT_KEY: ", CONTENT_KEY);

  let settings = await db.get(CONTENT_KEY);

  if (!settings || !settings.verify_token) {
    console.error("No settings found! Unable to verify token.")
    res.sendStatus(403);
  } else {
    let VERIFY_TOKEN = settings.verify_token;

    console.log("token: ", token);
    console.log("verify token: ", VERIFY_TOKEN);

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === VERIFY_TOKEN) {

        // Respond with 200 OK and challenge token from the request
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        console.error("mode is not 'subscribe' or token do not match");
        res.sendStatus(403);
      }
    } else {
      console.error("mode or token undefined");
      res.status(400).send("impossible to verify the webhook: mode or token undefined.")
    }

  }

});

function getRandomName() {

  let hexString = uuidv4();
  console.log("hex: ", hexString);
  
  // remove decoration
  hexString = hexString.replace(/-/g, '');
  
  let base64String = Buffer.from(hexString, 'hex').toString('base64')
  console.log("base64: ", base64String);
  
  return base64String;
}


router.post("/newtest", async (req, res) => {
  //bottest:bot_id:code
  console.log("/newtest body: ", JSON.stringify(req.body, null, 2));
  let project_id = req.body.project_id;
  let bot_id = req.body.bot_id;

  let info = {
    project_id: project_id,
    bot_id: bot_id
  }

  //let short_uid = getRandomName();
  let short_uid = uuidv4().substring(0, 8)
  let TEST_KEY = "bottest:" + short_uid;

  await redis_client.json.set(TEST_KEY, '.', info);
  const value = await redis_client.json.get(TEST_KEY)
  console.log("get --> value: ", value)
  /*
  const value = await redis_client.json.get(TEST_KEY, {
    // JSON Path: .node = the element called 'node' at root level.
    path: '.nodell',
  });
  */
  res.status(200).send({short_uid: short_uid});
})

router.post("/testitout/:project_id", async (req, res) => {

  //console.log("\n/(testitout): ", JSON.stringify(req.body, null, 2));
  console.log("\n/(testitout)");
  let projectId = req.params.project_id;
  console.log("(testitout) projectId: ", projectId)

  let whatsappChannelMessage = req.body.entry[0].changes[0].value.messages[0];
  console.log("(testitout) whatsappChannelMessage: ", whatsappChannelMessage);

  let whatsappContact = req.body.entry[0].changes[0].value.contacts[0];

  let REDIS_KEY = "bottest:" + whatsappChannelMessage.text.body.substring(3);
  console.log("(testitout) key: ", REDIS_KEY);

  const info = await redis_client.json.get(REDIS_KEY);
  console.log("(testitout) info: ", info);
  
  let message_info = {
    channel: "whatsapp",
    whatsapp: {
      phone_number_id: req.body.entry[0].changes[0].value.metadata.phone_number_id,
      from: whatsappChannelMessage.from,
      firstname: whatsappContact.profile.name,
      lastname: " "
    }
  }
  console.log("(testitout) message_info: ", message_info)
  
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
  
  const tlr = new TiledeskWhatsappTranslator();

  whatsappChannelMessage.text.body = "/start";
  let tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, whatsappContact.profile.name);
  console.log("(testitout) tiledeskJsonMessage: ", tiledeskJsonMessage)
  
  const tdChannel = new TiledeskChannel({ settings: settings, API_URL: API_URL })
  const response = await tdChannel.sendAndAddBot(tiledeskJsonMessage, message_info, info.bot_id)
  console.log("testitout --> send response: ", response)
  
  res.status(200).send("testitout")
})


// *****************************
// ********* FUNCTIONS *********
// *****************************

async function startApp(settings, callback) {
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

  if (!settings.APPS_API_URL) {
    throw new Error("settings.APPS_API_URL is mandatory");
  } else {
    APPS_API_URL = settings.APPS_API_URL;
    console.log("APPS_API_URL: ", APPS_API_URL);
  }

  if (!settings.REDIS_HOST) {
    throw new Error("!settings.REDIS_HOST is mandatory");
  } else {
    REDIS_HOST = settings.REDIS_HOST;
    console.log("REDIS_HOST: ", REDIS_HOST);
  }

  if (!settings.REDIS_PORT) {
    throw new Error("!settings.REDIS_PORT is mandatory");
  } else {
    REDIS_PORT = settings.REDIS_PORT;
    console.log("REDIS_PORT: ", REDIS_PORT);
  }

  if (!settings.REDIS_PASSWORD) {
    throw new Error("!settings.REDIS_PASSWORD is mandatory");
  } else {
    REDIS_PASSWORD = settings.REDIS_PASSWORD;
    console.log("REDIS_PASSWORD: *************");
  }

  if (settings.log) {
    log = settings.log;
  }

  redis_client = redis.createClient({
        host: REDIS_HOST,
        port: REDIS_PORT,
    password: REDIS_PASSWORD
  });

  redis_client.on('error', err => {
    console.log('Error ' + err);
  })
  /*
  redis_client.on('connect', () => {
    console.log('Redis Connected!'); // Connected!
  });
  */
  redis_client.on('ready', () => {
    console.log("Redis ready")
  })
  //await redis_client.connect(); // only for v4
  

  db.connect(settings.MONGODB_URL, () => {
    console.log("KVBaseMongo successfully connected.");
    
    if (callback) {
      callback();
    }
  })
}

function readHTMLFile(templateName, callback) {
  console.log("Reading file: ", templateName)
  fs.readFile(__dirname + '/template' + templateName, { encoding: 'utf-8' },
    function(err, html) {
      if (err) {
        throw err;
        //callback(err);
      } else {
        callback(null, html)
      }
    })
}

module.exports = { router: router, startApp: startApp };