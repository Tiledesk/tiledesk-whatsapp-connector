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
var winston = require('./winston');
const url = require('url');  

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
const db = new KVBaseMongo(kvbase_collection);

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

  winston.verbose("(wab) /detail")

  let project_id = req.query.project_id;
  let token = req.query.token;
  let app_id = req.query.app_id;

  const tdChannel = new TiledeskChannel({ settings: { project_id: project_id, token: token }, API_URL: API_URL })
  let isAvailable = await tdChannel.getProjectDetail();
  winston.debug("(wab) app is available: ", isAvailable);
  
  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  let installation = await appClient.getInstallations(project_id, app_id);

  let installed = false;
  if (installation) {
    installed = true;
  }

  readHTMLFile('/detail.html', (err, html) => {
    var template = handlebars.compile(html);
    var replacements = {
      app_version: pjson.version,
      project_id: project_id,
      token: token,
      app_id: app_id,
      installed: installed,
      isAvailable: isAvailable
    }
    var html = template(replacements);
    res.send(html);
  })
})

router.post('/install', async (req, res) => {

  winston.verbose("(wab) /install")

  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  winston.debug("(wab) Install app " + app_id + " for project id " + project_id);
  let installation_info = {
    project_id: project_id,
    app_id: app_id,
    createdAt: Date.now()
  };

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  appClient.install(installation_info).then((installation) => {
    winston.debug("(wab) installation response: " + installation);

    res.redirect(url.format({
     pathname:"/detail",
     query: {
        "project_id": project_id,
        "app_id": app_id,
        "token": token
      }
    }));
    
  }).catch((err) => {
    winston.error("(wab) installation error: " + err.data)
    res.send("An error occurred during the installation");
  })

})

router.post('/uninstall', async (req, res) => {

  winston.verbose("(wab) /uninstall");
  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  appClient.uninstall(project_id, app_id).then((response) => {

    winston.debug("(wab) uninstallation response: " + response);

    res.redirect(url.format({
     pathname:"/detail",
     query: {
        "project_id": project_id,
        "app_id": app_id,
        "token": token
      }
    }));

  }).catch((err) => {
    winston.error("(wab) uninsallation error: " + err.data)
    res.send("An error occurred during the uninstallation");
  })
})

router.get('/configure', async (req, res) => {

  winston.verbose("(wab) /configure");

  let projectId = "";
  let token = "";

  projectId = req.query.project_id;
  token = req.query.token;

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  let CONTENT_KEY = "whatsapp-" + projectId;

  let settings = await db.get(CONTENT_KEY);
  winston.debug("(wab) settings: " + settings);

  // get departments
  const tdChannel = new TiledeskChannel({ settings: { project_id: projectId, token: token }, API_URL: API_URL })
  let departments = await tdChannel.getDepartments(token);
  winston.debug("(wab) found " + departments.length + " departments")

  if (settings) {

    readHTMLFile('/configure.html', (err, html) => {
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
        winston.error("(wab) error read html file: " + err);
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

  winston.verbose("(wab) /update");

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

  if (settings) {

    settings.wab_token = wab_token;
    settings.verify_token = verify_token;
    settings.department_id = department_id;

    await db.set(CONTENT_KEY, settings);

    readHTMLFile('/configure.html', (err, html) => {
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

    const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, project_id: projectId, token: token })

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
      winston.debug("\n(wab) Subscription: " + subscription)

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

  winston.verbose("(wab) /disconnect")

  let projectId = req.body.project_id;
  let token = req.body.token;
  let subscriptionId = req.body.subscription_id;


  let CONTENT_KEY = "whatsapp-" + projectId;
  await db.remove(CONTENT_KEY);
  winston.verbose("(wab) Content deleted.");

  let proxy_url = BASE_URL + "/webhook/" + projectId;

  const tdClient = new TiledeskSubscriptionClient({ API_URL: API_URL, project_id: projectId, token: token })
  // get departments
  const tdChannel = new TiledeskChannel({ settings: { project_id: projectId, token: token }, API_URL: API_URL })
  let departments = await tdChannel.getDepartments(token);

  /*
  // callback
  tdClient.unsubsribe(projectId, subscriptionId, (err, data) => {
    // code here
  })
  */

  tdClient.unsubscribe(subscriptionId).then((data) => {

    readHTMLFile('/configure.html', (err, html) => {
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
    winston.error("(wab) unsubscribe error: " + err);
  })

})

router.post('/tiledesk', async (req, res) => {
  winston.verbose("(wab) Message received from Tiledesk")

  var tiledeskChannelMessage = req.body.payload;
  var projectId = req.body.payload.id_project;

  // get settings from mongo
  let CONTENT_KEY = "whatsapp-" + projectId;
  let settings = await db.get(CONTENT_KEY);
  let wab_token = settings.wab_token;

  var text = req.body.payload.text;
  let attributes = req.body.payload.attributes;
  let commands;
  if (attributes && attributes.commands) {
    commands = attributes.commands;
  }

  var sender_id = req.body.payload.sender;

  if (sender_id.indexOf("wab") > -1) {
    winston.verbose("(wab) Skip same sender");
    return res.sendStatus(200);
  }

  if (attributes && attributes.subtype === "info") {
    winston.verbose("(wab) Skip subtype (info)");
    return res.sendStatus(200);
  }

  if (attributes && attributes.subtype === 'info/support') {
    winston.verbose("(wab) Skip subtype: " + attributes.subtype);
    return res.sendStatus(200);
  }

  let recipient_id = tiledeskChannelMessage.recipient;
  let whatsapp_receiver = recipient_id.substring(recipient_id.lastIndexOf("-") + 1);
  let phone_number_id = recipient_id.substring(recipient_id.lastIndexOf("wab-") + 4, recipient_id.lastIndexOf("-"));

  winston.debug("(wab) text: " + text);
  winston.debug("(wab) attributes: " + attributes)
  winston.debug("(wab) tiledesk sender_id: " + sender_id);
  winston.debug("(wab) recipient_id: " + recipient_id);
  winston.debug("(wab) whatsapp_receiver: " + whatsapp_receiver);
  winston.debug("(wab) phone_number_id: " + phone_number_id)

  const messageHandler = new MessageHandler({ tiledeskChannelMessage: tiledeskChannelMessage });
  const tlr = new TiledeskWhatsappTranslator();

  if (commands) {
    let i = 0;
    async function execute(command) {
      // message
      if (command.type === "message") {
        let tiledeskCommandMessage = await messageHandler.generateMessageObject(command);
        winston.debug("(wab) message generated from command: " + tiledeskCommandMessage)

        let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskCommandMessage, whatsapp_receiver);
        winston.verbose("(wab) 🟢 whatsappJsonMessage" + whatsappJsonMessage)

        if (whatsappJsonMessage) {
          const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });
          twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
            winston.verbose("(wab) Message sent to WhatsApp! " + response.status + " " + response.statusText);
            i += 1;
            if (i < commands.length) {
              execute(commands[i]);
            } else {
              winston.debug("(wab) End of commands")
            }
          }).catch((err) => {
            winston.error("(wab) send message error: " + err);
          })
        } else {
          winston.error("(wab) WhatsappJsonMessage is undefined!")
        }

      }

      //wait
      if (command.type === "wait") {
        setTimeout(() => {
          i += 1;
          if (i < commands.length) {
            execute(commands[i]);
          } else {
            winston.debug("(wab) End of commands")
          }
        }, command.time)
      }
    }
    execute(commands[0]);
  }

  else if (tiledeskChannelMessage.text || tiledeskChannelMessage.metadata) {

    let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    winston.verbose("(wab) 🟢 whatsappJsonMessage" + whatsappJsonMessage)

    if (whatsappJsonMessage) {
      const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL });

      twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
        winston.verbose("(wab) Message sent to WhatsApp! " + response.status + " " + response.statusText);
      }).catch((err) => {
        winston.error("(wab) error send message: " + err);
      })

    } else {
      winston.error("(wab) Whatsapp Json Message is undefined!")
    }

  } else {
    winston.debug("(wab) no command, no text --> skip")
  }

  return res.send(200);
})

// Endpoint for Whatsapp Business
// Accepts POST requests at /webhook endpoint
router.post("/webhook/:project_id", async (req, res) => {

  // Parse the request body from the POST
  let projectId = req.params.project_id;
  winston.verbose("(wab) Message received from WhatsApp");

  // Check the Incoming webhook message
  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {

      if (req.body.entry[0].changes[0].value.messages[0].type == "system") {
        winston.verbos("(wab) Skip system message")
        return res.sendStatus(200);
      }

      let whatsappChannelMessage = req.body.entry[0].changes[0].value.messages[0];

      let CONTENT_KEY = "whatsapp-" + projectId;
      let settings = await db.get(CONTENT_KEY);
      winston.debug("(wab) settings: " + settings);

      if (!settings) {
        winston.verbose("(wab) No settings found. Exit..");
        return res.sendStatus(200);
      }

      const tlr = new TiledeskWhatsappTranslator();
      const tdChannel = new TiledeskChannel({ settings: settings, API_URL: API_URL })

      // Initialize conversation with chatbot
      if (whatsappChannelMessage.text && whatsappChannelMessage.text.body.startsWith("#td")) {

        let code = whatsappChannelMessage.text.body.split(' ')[0];

        const bottester = new TiledeskBotTester({ project_id: projectId, redis_client: redis_client, db: db, tdChannel: tdChannel, tlr: tlr });
        bottester.startBotConversation(req.body, code).then((result) => {
          winston.verbose("(wab) test conversation started");
          winston.debug("(wab) startBotConversation result: " + result);
        }).catch((err) => {
          winston.error("(wab) start test onversation error: " + err);
        })

        // Standard message
      } else {

        let firstname = req.body.entry[0].changes[0].value.contacts[0].profile.name;

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
          winston.debug("(wab) message type: text")
          tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname);
        }

        else if (whatsappChannelMessage.type == 'interactive') {
          winston.debug("(wab) message type: interactive")
          tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname);
        }

        else if ((whatsappChannelMessage.type == 'image') || (whatsappChannelMessage.type == 'video') || (whatsappChannelMessage.type == 'document')) {
          let media;
          const util = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL })

          if (whatsappChannelMessage.type == 'image') {
            media = whatsappChannelMessage.image;
            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug("(wab) Unable to download media with id " + media.id + ". Message not sent.");
              return res.status(500).send({ success: false, error: "unable to download media" })
            }
            let file_path = path.join(__dirname, 'tmp', filename);

            const image_url = await util.uploadMedia(file_path, "images");
            winston.debug("(wab) image_url: " + image_url)

            tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname, image_url);
          }

          if (whatsappChannelMessage.type == 'video') {
            media = whatsappChannelMessage.video;

            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug("(wab) Unable to download media with id " + media.id + ". Message not sent.");
              return res.status(500).send({ success: false, error: "unable to download media" })
            }
            let file_path = path.join(__dirname, 'tmp', filename);

            const media_url = await util.uploadMedia(file_path, "files");
            winston.debug("(wab) media_url: " + media_url)

            tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname, media_url);
          }

          if (whatsappChannelMessage.type == 'document') {
            media = whatsappChannelMessage.document;

            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug("(wab) Unable to download media with id " + media.id + ". Message not sent.");
              return res.status(500).send({ success: false, error: "unable to download media" })
            }
            let file_path = path.join(__dirname, 'tmp', filename);

            const media_url = await util.uploadMedia(file_path, "files");
            winston.debug("(wab) media_url: " + media_url)

            tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname, media_url);
          }

        } else {
          // unsupported. Try anyway to send something.
          winston.debug("(wab) unsupported message")
        }

        if (tiledeskJsonMessage) {
          winston.verbose("(wab) 🟠 tiledeskJsonMessage: " + tiledeskJsonMessage);
          const response = await tdChannel.send(tiledeskJsonMessage, message_info, settings.department_id);
          winston.verbose("(wab) Message sent to Tiledesk!")
          winston.debug("(wab) response: " + response)
        } else {
          winston.verbose("(wab) tiledeskJsonMessage is undefined")
        }

      }
    }
    res.sendStatus(200);

  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    winston.verbose("(wab) event not from whatsapp")
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
  winston.verbose("(wab) Verify the webhook... ");
  winston.debug("(wab) req.query: " + req.query);

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  let CONTENT_KEY = "whatsapp-" + req.params.project_id;

  let settings = await db.get(CONTENT_KEY);

  if (!settings || !settings.verify_token) {
    winston.error("(wab) No settings found! Unable to verify token.")
    res.sendStatus(403);
  } else {
    let VERIFY_TOKEN = settings.verify_token;

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        // Respond with 200 OK and challenge token from the request
        winston.verbose("(wab) Webhook verified");
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        winston.error("(wab) mode is not 'subscribe' or token do not match");
        res.sendStatus(403);
      }
    } else {
      winston.error("(wab) mode or token undefined");
      res.status(400).send("impossible to verify the webhook: mode or token undefined.")
    }

  }

});


router.post("/newtest", async (req, res) => {

  winston.verbose("(wab) initializing new test..");

  let project_id = req.body.project_id;
  let bot_id = req.body.bot_id;

  let info = {
    project_id: project_id,
    bot_id: bot_id
  }

  let short_uid = uuidv4().substring(0, 8)
  let key = "bottest:" + short_uid;

  if (!redis_client) {
    return res.status(500).send({ message: "Test it out on Whatsapp not available. Redis not ready." })
  }

  await redis_client.set(key, JSON.stringify(info), 'EX', 604800);
  redis_client.get(key, (err, value) => {
    if (err) {
      winston.error("(wab) redis get err: " + err)
      return res.status(500).send({ success: "false", message: "Testing info could not be saved" });
    } else {
      winston.debug("(wab) new test initialized with id: " + short_uid)
      return res.status(200).send({ short_uid: short_uid });
    }
  })

})

// *****************************
// ********* FUNCTIONS *********
// *****************************

async function startApp(settings, callback) {
  winston.info("(wab) Starting Whatsapp App")

  if (!settings.MONGODB_URL) {
    throw new Error("settings.MONGODB_URL is mandatory");
  }

  if (!settings.API_URL) {
    throw new Error("settings.API_URL is mandatory");
  } else {
    API_URL = settings.API_URL;
    winston.info("(wab) API_URL: " + API_URL);
  }

  if (!settings.BASE_URL) {
    throw new Error("settings.BASE_URL is mandatory");
  } else {
    BASE_URL = settings.BASE_URL;
    winston.info("(wab) BASE_URL: " + BASE_URL);
  }

  if (!settings.GRAPH_URL) {
    throw new Error("settings.GRAPH_URL is mandatory");
  } else {
    GRAPH_URL = settings.GRAPH_URL;
    winston.info("(wab) GRAPH_URL: " + GRAPH_URL);
  }

  if (!settings.APPS_API_URL) {
    throw new Error("settings.APPS_API_URL is mandatory");
  } else {
    APPS_API_URL = settings.APPS_API_URL;
    winston.info("(wab) APPS_API_URL: " + APPS_API_URL);
  }

  if (settings.REDIS_HOST && settings.REDIS_PORT) {
    REDIS_HOST = settings.REDIS_HOST;
    REDIS_PORT = settings.REDIS_PORT;
    REDIS_PASSWORD = settings.REDIS_PASSWORD;
    connectRedis();
  } else {
    winston.info("(wab) Missing redis parameters --> Test it out on WhatsApp disabled");
  }

  db.connect(settings.MONGODB_URL, () => {
    winston.info("(wab) KVBaseMongo successfully connected.");

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
    winston.info('(wab) Connect Redis Error ' + err);
  })
  /*
  redis_client.on('connect', () => {
    winston.info('Redis Connected!'); // Connected!
  });
  */
  redis_client.on('ready', () => {
    winston.info("(wab) Redis ready!")
  })
  //await redis_client.connect(); // only for v4

}

function readHTMLFile(templateName, callback) {
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