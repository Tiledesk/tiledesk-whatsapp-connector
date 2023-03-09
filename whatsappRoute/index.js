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
//const { TiledeskClient } = require('@tiledesk/tiledesk-client');
const { TiledeskWhatsappTranslator } = require('./tiledesk/TiledeskWhatsappTranslator');
const { TiledeskSubscriptionClient } = require('./tiledesk/TiledeskSubscriptionClient');
const { TiledeskWhatsapp } = require('./tiledesk/TiledeskWhatsapp');
const { TiledeskChannel } = require('./tiledesk/TiledeskChannel');
const { TiledeskAppsClient } = require('./tiledesk/TiledeskAppsClient');
const { MessageHandler } = require('./tiledesk/MessageHandler');
const { TiledeskBotTester } = require('./tiledesk/TiledeskBotTester');

// mongo
const { KVBaseMongo } = require('./tiledesk/KVBaseMongo');
const kvbase_collection = 'kvstore';
const db = new KVBaseMongo({KVBASE_COLLECTION: kvbase_collection, log: false});

// mongo old
//const { KVBaseMongo } = require('@tiledesk/tiledesk-kvbasemongo')
//const kvbase_collection = 'kvstore';
//const db = new KVBaseMongo(kvbase_collection);

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

// Handlebars register helpers
handlebars.registerHelper('isEqual', (a, b) => {
  if (a == b) {
    return true
  } else {
    return false
  }
})

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
      console.log("(whatsapp) error read html file: ", err);
    }

    var template = handlebars.compile(html);
    var replacements = {
      app_version: pjson.version,
      project_id: projectId,
      token: token,
      app_id: app_id,
      installed: installed
    }
    var html = template(replacements);
    res.send(html);
  })
})

router.post('/install', async (req, res) => {

  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  console.log("(whatsapp) Install app " + app_id + " for project id " + project_id);
  let installation_info = {
    project_id: project_id,
    app_id: app_id,
    createdAt: Date.now()
  };

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  appClient.install(installation_info).then((installation) => {

    if (log) {
      console.log("(whatsapp) installation response: ", installation);
    }

    let installed = true;

    readHTMLFile('/detail.html', (err, html) => {
      if (err) {
        console.log("(whatsapp) error read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        app_id: app_id,
        installed: installed
      }
      var html = template(replacements);
      res.send(html);
    })

  }).catch((err) => {
    console.error("(whatsapp) installation error: ", err.data)
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
      console.log("(whatsapp) uninstallation response: ", response);
    }

    let installed = false;

    readHTMLFile('/detail.html', (err, html) => {
      if (err) {
        console.log("(whatsapp) error read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        app_id: app_id,
        installed: installed
      }
      var html = template(replacements);
      res.send(html);
    })

  }).catch((err) => {
    console.error("(whatsapp) uninsallation error: ", err.data)
    res.send("An error occurred during the uninstallation");
  })
})

router.get('/configure', async (req, res) => {
  console.log("\n(whatsapp) /configure");
  if (log) {
    console.log("(whatsapp) /configure query: ", req.query);
  }

  let projectId = "";
  let token = "";

  projectId = req.query.project_id;
  token = req.query.token;

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  let CONTENT_KEY = "whatsapp-" + projectId;
  
  let settings = await db.get(CONTENT_KEY);
  if (log) {
    console.log("(whatsapp) kvdb settings: ", settings);
  }

  // get departments
  const tdChannel = new TiledeskChannel({ settings: { project_id: projectId, token: token }, API_URL: API_URL })
  let departments = await tdChannel.getDepartments(token);
  if (log) {
    console.log("departments: ", JSON.stringify(departments))
  }

  if (settings) {

    readHTMLFile('/configure.html', (err, html) => {
      if (err) {
        console.log("(whatsapp) error read html file: ", err);
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
        department_id: settings.department_id,
        departments: departments
      }
      var html = template(replacements);
      res.send(html);

    })

  } else {

    readHTMLFile('/configure.html', (err, html) => {

      if (err) {
        console.log("(whatsapp) error read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        departments: departments
      }
      var html = template(replacements);
      res.send(html);

    })
  }
})

router.post('/update', async (req, res) => {
  console.log("\n(whatsapp) /update");
    console.log("(whatsapp) /update body: ", req.body);
  if (log) {
  }

  let projectId = req.body.project_id;
  let token = req.body.token;
  let wab_token = req.body.wab_token;
  let verify_token = req.body.verify_token;
  let department_id = req.body.department;

  let CONTENT_KEY = "whatsapp-" + projectId;
  let settings = await db.get(CONTENT_KEY);

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  // get departments
  const tdChannel = new TiledeskChannel({ settings: { project_id: projectId, token: token }, API_URL: API_URL })
  let departments = await tdChannel.getDepartments(token);
  if (log) {
    console.log("departments: ", JSON.stringify(departments))
  }

  if (settings) {

    settings.wab_token = wab_token;
    settings.verify_token = verify_token;
    settings.department_id = department_id;

    await db.set(CONTENT_KEY, settings);

    readHTMLFile('/configure.html', (err, html) => {
      if (err) {
        console.log("(whatsapp) error read html file: ", err);
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
        department_id: settings.department_id,
        departments: departments
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
        console.log("\n(whatsapp) Subscription: ", subscription)
      }

      let settings = {
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        subscriptionId: subscription._id,
        secret: subscription.secret,
        wab_token: wab_token,
        verify_token: verify_token,
        department_id: department_id
      }

      db.set(CONTENT_KEY, settings)
      //let cnt = db.get(CONTENT_KEY);

      readHTMLFile('/configure.html', (err, html) => {
        if (err) {
          console.log("(whatsapp) error read html file: ", err);
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
          department_id: settings.department_id,
          departments: departments
        }
        var html = template(replacements);
        res.send(html);
      })

    }).catch((err) => {

      readHTMLFile('/configure.html', (err, html) => {
        if (err) {
          console.log("(whatsapp) error read html file: ", err);
        }

        var template = handlebars.compile(html);
        var replacements = {
          app_version: pjson.version,
          project_id: projectId,
          token: token,
          proxy_url: proxy_url,
          departments: departments,
          show_error_modal: true
        }
        var html = template(replacements);
        res.send(html);
      })
    })

  }
})

router.post('/disconnect', async (req, res) => {
  console.log("\n(whatsapp) /disconnect")
  if (log) {
    console.log("(whatsapp) /disconnect body: ", req.body)
  }

  let projectId = req.body.project_id;
  let token = req.body.token;
  let subscriptionId = req.body.subscription_id;


  let CONTENT_KEY = "whatsapp-" + projectId;
  await db.remove(CONTENT_KEY);
  console.log("(whatsapp) Content deleted.");

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, project_id: projectId, token: token, log: false })
  // get departments
  const tdChannel = new TiledeskChannel({ settings: { project_id: projectId, token: token }, API_URL: API_URL })
  let departments = await tdChannel.getDepartments(token);
  if (log) {
    console.log("departments: ", JSON.stringify(departments))
  }

  /*
  // callback
  tdClient.unsubsribe(projectId, subscriptionId, (err, data) => {
    // code here
  })
  */

  tdClient.unsubscribe(subscriptionId).then((data) => {

    readHTMLFile('/configure.html', (err, html) => {

      if (err) {
        console.log("(whatsapp) error read html file: ", err);
      }

      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: projectId,
        token: token,
        proxy_url: proxy_url,
        departments: departments
      }
      var html = template(replacements);
      res.send(html);
    })

  }).catch((err) => {
    console.error("(whatsapp) error unsubscribe: ", err);
  })

})

router.post('/tiledesk', async (req, res) => {
  console.log("\n(whatsapp) /tiledesk")
  console.log("(whatsapp) /tiledesk ---> tiledeskChannelMessage: " + JSON.stringify(req.body.payload));
  if (log) {
  }

  var tiledeskChannelMessage = req.body.payload;
  
  var projectId = req.body.payload.id_project;

  // get settings from mongo
  let CONTENT_KEY = "whatsapp-" + projectId;
  let settings = await db.get(CONTENT_KEY);
  let wab_token = settings.wab_token;

  var text = req.body.payload.text;
  if (log) {
    console.log("(whatsapp) /tiledesk text: ", text);
  }

  let attributes = req.body.payload.attributes;
  if (log) {
    console.log("(whatsapp) /tiledesk attributes: ", JSON.stringify(attributes))
  }

  let commands;
  if (attributes && attributes.commands) {
    commands = attributes.commands;
  }

  var sender_id = req.body.payload.sender;
  console.log("(whatsapp) /tiledesk sender_id: ", sender_id);

  if (sender_id.indexOf("wab") > -1) {
    console.log("Skip same sender");
    return res.send(200);
  }

  if (attributes && attributes.subtype === "info") {
    console.log("(whatsapp) /tiledesk Skip subtype (info)");
    return res.send(200);
  }

  if (attributes && attributes.subtype === 'info/support') {
    console.log("(whatsapp) /tiledesk Skip subtype: ", attributes.subtype);
    return res.send(200);
  }

  let recipient_id = tiledeskChannelMessage.recipient;
  if (log) {
    console.log("(whatsapp) /tiledesk Recipient_id: ", recipient_id);
  }

  let whatsapp_receiver = recipient_id.substring(recipient_id.lastIndexOf("-") + 1);
  if (log) {
    console.log("(whatsapp) /tiledesk whatsapp_receiver: ", whatsapp_receiver);
  }

  let phone_number_id = recipient_id.substring(recipient_id.lastIndexOf("wab-") + 4, recipient_id.lastIndexOf("-"));
  if (log) {
    console.log("(Tiledesk) phone_number_id: ", phone_number_id)
  }

  const messageHandler = new MessageHandler({ tiledeskChannelMessage: tiledeskChannelMessage });
  const tlr = new TiledeskWhatsappTranslator();

  if (commands) {
    let i = 0;
    async function execute(command) {
      // message
      if (command.type === "message") {
        let tiledeskCommandMessage = await messageHandler.generateMessageObject(command);
        console.log("(whatsapp) message generated\ntiledeskCommandMessage: ", JSON.stringify(tiledeskCommandMessage))

        let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskCommandMessage, whatsapp_receiver);
        console.log("🟢 whatsappJsonMessage", JSON.stringify(whatsappJsonMessage))

        if (whatsappJsonMessage) {
          const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });
          twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
            i += 1;
            if (i < commands.length) {
              execute(commands[i]);
            } else {
              console.log("(whatsapp) End of commands")
            }
          }).catch((err) => {
            console.error("(whatsapp) error send message: ", err);
          })
        } else {
          console.error("(whatsapp) Whatsapp Json Message is undefined!")
        }
        
      }

      //wait
      if (command.type === "wait") {
        setTimeout(() => {
          i += 1;
          if (i < commands.length) {
            execute(commands[i]);
          } else {
            console.log("(whatsapp) End of commands")
          }
        }, command.time)
      }
    }
    execute(commands[0]);
  }

  else if (tiledeskChannelMessage.text  || tiledeskChannelMessage.metadata) {

    let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    console.log("🟢 whatsappJsonMessage", JSON.stringify(whatsappJsonMessage))

    if (whatsappJsonMessage) {
      const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });
  
      twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
        console.log("(whatsapp) Send message response: ", response.status, response.statusText);
      }).catch((err) => {
        console.error("(whatsapp) error send message: ", err);
      })
  
    } else {
      console.error("(whatsapp) Whatsapp Json Message is undefined!")
    }
    
  } else {
    console.log("(whatsapp) no command, no text --> skip")
  }

  return res.send(200);
})

// Endpoint for Whatsapp Business
// Accepts POST requests at /webhook endpoint
router.post("/webhook/:project_id", async (req, res) => {
  
  // Parse the request body from the POST
  let projectId = req.params.project_id;
  //console.log("/webhook req.body: ", JSON.stringify(req.body, null, 2))

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

      console.log("\n(whatsapp) /whatsapp Body: ", JSON.stringify(req.body));

      if (req.body.entry[0].changes[0].value.messages[0].type == "system") {
        console.log("(whatsapp) Skip system message")
        return res.sendStatus(200);
      }

      let whatsappChannelMessage = req.body.entry[0].changes[0].value.messages[0];

      let CONTENT_KEY = "whatsapp-" + projectId;
      let settings = await db.get(CONTENT_KEY);
      if (log) {
        console.log("(whatsapp) kvdb settings: ", settings);
      }
      if (!settings) {
        console.log("(whatsapp) No settings found. Exit..");
        return res.sendStatus(200);
      }

      const tlr = new TiledeskWhatsappTranslator();
      const tdChannel = new TiledeskChannel({ settings: settings, API_URL: API_URL })

      // Initialize conversation with chatbot
      if (whatsappChannelMessage.text && whatsappChannelMessage.text.body.startsWith("#td")) { 

        console.log("\nwhatsappChannelMessage.text.body: ", whatsappChannelMessage.text.body)
        let code = whatsappChannelMessage.text.body.split(' ')[0];
        console.log("code: ", code)

        const bottester = new TiledeskBotTester({project_id: projectId, redis_client: redis_client, db: db, tdChannel: tdChannel, tlr: tlr});
        bottester.startBotConversation(req.body, code).then((result) => {
          console.log("(whatsapp) startBotConversation result: ", result);
        }).catch((err) => {
          console.log("(whatsapp) startBotConversation result: ", err);
        })

      // Standard message
      } else {
        
        let firstname = req.body.entry[0].changes[0].value.contacts[0].profile.name;
        if (log) {
          console.log("(whatsapp) /whatsapp firstname: ", firstname)         
        }

        let message_info = {
          channel: "whatsapp",
          whatsapp: {
            phone_number_id: req.body.entry[0].changes[0].value.metadata.phone_number_id,
            from: req.body.entry[0].changes[0].value.messages[0].from,
            firstname: req.body.entry[0].changes[0].value.contacts[0].profile.name,
            lastname: " "
          }
        }
  
        let tiledeskJsonMessage;
        
        if ((whatsappChannelMessage.type == 'text')) {
          console.log("(whatsapp) /whatsapp message type text")
          tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname);
  
        }
        else if (whatsappChannelMessage.type == 'interactive') {
          console.log("(whatsapp) /whatsapp message type interactive")
          tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname);
        }

        else if ((whatsappChannelMessage.type == 'image') || (whatsappChannelMessage.type == 'video') || (whatsappChannelMessage.type == 'document')) {
          let media;
          const util = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL })
  
          if (whatsappChannelMessage.type == 'image') {
            media = whatsappChannelMessage.image;
            console.log("(whatsapp) /whatsapp media_id: ", media.id);
  
            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              console.log("(whatsapp) /whatsapp Unable to download media. Message not sent.");
              return res.status(500).send({ success: false, error: "unable to download media" })
            }
            let file_path = path.join(__dirname, 'tmp', filename);
  
            const image_url = await util.uploadMedia(file_path, "images");
            console.log("(whatsapp) /whatsapp image_url: ", image_url)
  
            tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname, image_url);
          }
  
          if (whatsappChannelMessage.type == 'video') {
            media = whatsappChannelMessage.video;
  
            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              console.log("(whatsapp) /whatsapp Unable to download media. Message not sent.");
              return res.status(500).send({ success: false, error: "unable to download media" })
            }
            let file_path = path.join(__dirname, 'tmp', filename);
  
  
            const media_url = await util.uploadMedia(file_path, "files");
            console.log("(whatsapp) /whatsapp media_url: ", media_url)
  
            tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname, media_url);
          }
  
          if (whatsappChannelMessage.type == 'document') {
            media = whatsappChannelMessage.document;
  
            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              console.log("(whatsapp) /whatsapp Unable to download media. Message not sent.");
              return res.status(500).send({ success: false, error: "unable to download media" })
            }
            let file_path = path.join(__dirname, 'tmp', filename);
  
            const media_url = await util.uploadMedia(file_path, "files");
            console.log("(whatsapp) /whatsapp media_url: ", media_url)
  
            tiledeskJsonMessage = tlr.toTiledesk(whatsappChannelMessage, firstname, media_url);
          }
  
        } else {
          // unsupported. Try anyway to send something.
        }

        console.log("🟠 tiledeskJsonMessage: ", JSON.stringify(tiledeskJsonMessage));
        const response = await tdChannel.send(tiledeskJsonMessage, message_info, settings.department_id);
        if (log) {
          console.log("(whatsapp) /whatsapp Send response: ", response)
        }
        
      }
    } 
    res.sendStatus(200); 
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    console.log("event not from whatsapp")
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
  console.log("\n(whatsapp) Verify the webhook... ");
  console.log("(whatsapp) req.query: ", req.query);

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  let CONTENT_KEY = "whatsapp-" + req.params.project_id;

  let settings = await db.get(CONTENT_KEY);

  if (!settings || !settings.verify_token) {
    console.error("(whatsapp) No settings found! Unable to verify token.")
    res.sendStatus(403);
  } else {
    let VERIFY_TOKEN = settings.verify_token;

    if (log) {
      console.log("token: ", token);
      console.log("verify token: ", VERIFY_TOKEN);
    }

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === VERIFY_TOKEN) {

        // Respond with 200 OK and challenge token from the request
        console.log("(whatsapp) WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        console.error("(whatsapp) mode is not 'subscribe' or token do not match");
        res.sendStatus(403);
      }
    } else {
      console.error("(whatsapp) mode or token undefined");
      res.status(400).send("impossible to verify the webhook: mode or token undefined.")
    }

  }

});


router.post("/newtest", async (req, res) => {

  console.log("(whatsapp) /newtest body: ", JSON.stringify(req.body));
  let project_id = req.body.project_id;
  let bot_id = req.body.bot_id;

  let info = {
    project_id: project_id,
    bot_id: bot_id
  }

  let short_uid = uuidv4().substring(0, 8)
  let key = "bottest:" + short_uid;

  if (!redis_client) {
    return res.status(500).send({ message: "Test it out on Whatsapp not available. Redis not ready."})
  }

  await redis_client.set(key, JSON.stringify(info), 'EX', 604800);
  redis_client.get(key, (err, value) => {
    if (err) {
      console.log("(whatsapp) redis get err: ", err)
      return res.status(500).send({success: "false", message: "Testing info could not be saved"});
    } else {
      console.log("redis get value: ", value)
      return res.status(200).send({short_uid: short_uid});
    }
  })

})

// *****************************
// ********* FUNCTIONS *********
// *****************************

async function startApp(settings, callback) {
  console.log("(whatsapp) Starting Whatsapp App");

  if (!settings.MONGODB_URL) {
    throw new Error("settings.MONGODB_URL is mandatory");
  }

  if (!settings.API_URL) {
    throw new Error("settings.API_URL is mandatory");
  } else {
    API_URL = settings.API_URL;
    console.log("(whatsapp) API_URL: ", API_URL);
  }

  if (!settings.BASE_URL) {
    throw new Error("settings.BASE_URL is mandatory");
  } else {
    BASE_URL = settings.BASE_URL;
    console.log("(whatsapp) BASE_URL: ", BASE_URL);
  }

  if (!settings.GRAPH_URL) {
    throw new Error("settings.GRAPH_URL is mandatory");
  } else {
    GRAPH_URL = settings.GRAPH_URL;
    console.log("(whatsapp) GRAPH_URL: ", GRAPH_URL);
  }

  if (!settings.APPS_API_URL) {
    throw new Error("settings.APPS_API_URL is mandatory");
  } else {
    APPS_API_URL = settings.APPS_API_URL;
    console.log("(whatsapp) APPS_API_URL: ", APPS_API_URL);
  }

  if (settings.REDIS_HOST && settings.REDIS_PORT) {
    REDIS_HOST = settings.REDIS_HOST;
    REDIS_PORT = settings.REDIS_PORT;
    REDIS_PASSWORD = settings.REDIS_PASSWORD;
    connectRedis();
  } else {
    console.log("(whatsapp) Missing redis parameters --> Test it out on WhatsApp disabled");
  }

  if (settings.log) {
    log = settings.log;
  }

  db.connect(settings.MONGODB_URL, () => {
    console.log("(whatsapp) KVBaseMongo successfully connected.");
    
    if (callback) {
      callback();
    }
  })
}

function connectRedis() {
  redis_client = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD 
  });

  redis_client.on('error', err => {
    console.log('(whatsapp) Connect Redis Error ' + err);
  })
  /*
  redis_client.on('connect', () => {
    console.log('Redis Connected!'); // Connected!
  });
  */
  redis_client.on('ready', () => {
    console.log("(whatsapp) Redis ready!")
  })
  //await redis_client.connect(); // only for v4

}

function readHTMLFile(templateName, callback) {
  //console.log("Reading file: ", templateName)
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