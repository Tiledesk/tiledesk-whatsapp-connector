"use strict";
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const appRoot = require("app-root-path");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const pjson = require("./package.json");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
var winston = require("./winston");
const url = require("url");
const mongoose = require("mongoose");

//const ext = require('./routes/ext')
//const extRoute = ext.router;
const api = require("./routes/api");
const apiRoute = api.router;

// tiledesk clients
const { TiledeskClient } = require("@tiledesk/tiledesk-client");
const {
  TiledeskWhatsappTranslator,
} = require("./tiledesk/TiledeskWhatsappTranslator");
const {
  TiledeskSubscriptionClient,
} = require("./tiledesk/TiledeskSubscriptionClient");
const { TiledeskWhatsapp } = require("./tiledesk/TiledeskWhatsapp");
const { TiledeskChannel } = require("./tiledesk/TiledeskChannel");
const { TiledeskAppsClient } = require("./tiledesk/TiledeskAppsClient");
const { MessageHandler } = require("./tiledesk/MessageHandler");
const { TiledeskBotTester } = require("./tiledesk/TiledeskBotTester");
const { TemplateManager } = require("./tiledesk/TemplateManager");
const { WhatsappLogger } = require("./tiledesk/WhatsappLogger");

// mongo
const { KVBaseMongo } = require("./tiledesk/KVBaseMongo");
const kvbase_collection = "kvstore";
const db = new KVBaseMongo(kvbase_collection);

// mongo old
//const { KVBaseMongo } = require('@tiledesk/tiledesk-kvbasemongo')
//const kvbase_collection = 'kvstore';
//const db = new KVBaseMongo(kvbase_collection);

// redis
var redis = require("redis");
var redis_client;

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));
router.use(express.static(path.join(__dirname, "template")));
router.use(cors());

router.use("/ext", apiRoute);
router.use("/api", apiRoute);

let API_URL = null;
let GRAPH_URL = null;
let BASE_URL = null;
let APPS_API_URL = null;
let REDIS_HOST = null;
let REDIS_PORT = null;
let REDIS_PASSWORD = null;
let BASE_FILE_URL = null;
let AMQP_MANAGER_URL = null;
let JOB_TOPIC_EXCHANGE = null;
let BRAND_NAME = null;

// Handlebars register helpers
handlebars.registerHelper("isEqual", (a, b) => {
  if (a == b) {
    return true;
  } else {
    return false;
  }
});

handlebars.registerHelper("json", (a) => {
  return JSON.stringify(a);
});

router.get("/", async (req, res) => {
  res.send("Welcome to Tiledesk-WhatsApp Business connector!");
});

router.get("/detail", async (req, res) => {
  winston.verbose("(wab) /detail");

  let project_id = req.query.project_id;
  let token = req.query.token;
  let app_id = req.query.app_id;

  const tdChannel = new TiledeskChannel({
    settings: { project_id: project_id, token: token },
    API_URL: API_URL,
  });
  let isAvailable = await tdChannel.getProjectDetail();
  winston.debug("(wab) app is available: ", isAvailable);
  if (!project_id || !token || !app_id) {
    return res
      .status(500)
      .send(
        "<p>Ops! An error occured.</p><p>Missing query params! project_id, token and app_id are required.</p>"
      );
  }

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  let installation = await appClient.getInstallations(project_id, app_id);

  let installed = false;
  if (installation) {
    installed = true;
  }

  readHTMLFile("/detail.html", (err, html) => {
    var template = handlebars.compile(html);
    var replacements = {
      app_version: pjson.version,
      project_id: project_id,
      token: token,
      app_id: app_id,
      installed: installed,
      isAvailable: isAvailable,
    };
    var html = template(replacements);
    res.send(html);
  });
});

router.post("/install", async (req, res) => {
  winston.verbose("(wab) /install");

  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  winston.debug(
    "(wab) Install app " + app_id + " for project id " + project_id
  );
  let installation_info = {
    project_id: project_id,
    app_id: app_id,
    createdAt: Date.now(),
  };

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  appClient
    .install(installation_info)
    .then((installation) => {
      winston.debug("(wab) installation response: ", installation);

      res.redirect(
        url.format({
          pathname: BASE_URL + "/detail",
          query: {
            project_id: project_id,
            app_id: app_id,
            token: token,
          },
        })
      );
    })
    .catch((err) => {
      winston.error("(wab) installation error: " + err.data);
      res.send("An error occurred during the installation");
    });
});

router.post("/uninstall", async (req, res) => {
  winston.verbose("(wab) /uninstall");
  let project_id = req.body.project_id;
  let app_id = req.body.app_id;
  let token = req.body.token;

  const appClient = new TiledeskAppsClient({ APPS_API_URL: APPS_API_URL });
  appClient
    .uninstall(project_id, app_id)
    .then((response) => {
      winston.debug("(wab) uninstallation response: ", response);

      res.redirect(
        url.format({
          pathname: BASE_URL + "/detail",
          query: {
            project_id: project_id,
            app_id: app_id,
            token: token,
          },
        })
      );
    })
    .catch((err) => {
      winston.error("(wab) uninstallation error: " + err.data);
      res.send("An error occurred during the uninstallation");
    });
});

router.get("/configure", async (req, res) => {
  winston.verbose("(wab) /configure");

  let project_id = req.query.project_id;
  let token = req.query.token;
  let popup_view = false;

  if (req.query.view && req.query.view === "popup") {
    popup_view = true;
  }

  if (!project_id || !token) {
    let error_message = "Query params project_id and token are required.";
    readHTMLFile("/error.html", (err, html) => {
      var template = handlebars.compile(html);

      var replacements = {
        app_version: pjson.version,
        error_message: error_message,
      };
      var html = template(replacements);
      return res.send(html);
    });
  } else {
    let proxy_url = BASE_URL + "/webhook/" + project_id;

    let CONTENT_KEY = "whatsapp-" + project_id;

    let settings = await db.get(CONTENT_KEY);
    winston.debug("(wab) settings: ", settings);

    // get departments
    const tdChannel = new TiledeskChannel({
      settings: { project_id: project_id, token: token },
      API_URL: API_URL,
    });
    let departments = await tdChannel.getDepartments(token);
    winston.debug("(wab) found " + departments.length + " departments");

    if (settings) {
      readHTMLFile("/configure.html", (err, html) => {
        var template = handlebars.compile(html);
        var replacements = {
          app_version: pjson.version,
          project_id: project_id,
          token: token,
          proxy_url: proxy_url,
          wab_token: settings.wab_token,
          verify_token: settings.verify_token,
          business_account_id: settings.business_account_id,
          subscription_id: settings.subscriptionId,
          department_id: settings.department_id,
          departments: departments,
          brand_name: BRAND_NAME
        };
        var html = template(replacements);
        res.send(html);
      });
    } else {
      readHTMLFile("/configure.html", (err, html) => {
        if (err) {
          winston.error("(wab) error read html file: " + err);
        }

        var template = handlebars.compile(html);
        var replacements = {
          app_version: pjson.version,
          project_id: project_id,
          token: token,
          proxy_url: proxy_url,
          departments: departments,
          popup_view: popup_view,
          brand_name: BRAND_NAME
        };
        var html = template(replacements);
        res.send(html);
      });
    }
  }
});

router.post("/update", async (req, res) => {
  winston.verbose("(wab) /update");

  let project_id = req.body.project_id;
  let token = req.body.token;
  let wab_token = req.body.wab_token;
  let verify_token = req.body.verify_token;
  let department_id = req.body.department;
  let business_account_id = req.body.business_account_id;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  let proxy_url = BASE_URL + "/webhook/" + project_id;

  // get departments
  const tdChannel = new TiledeskChannel({
    settings: { project_id: project_id, token: token },
    API_URL: API_URL,
  });
  let departments = await tdChannel.getDepartments(token);

  if (settings) {
    settings.wab_token = wab_token;
    settings.verify_token = verify_token;
    settings.department_id = department_id;
    settings.business_account_id = business_account_id;

    await db.set(CONTENT_KEY, settings);

    readHTMLFile("/configure.html", (err, html) => {
      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        proxy_url: proxy_url,
        wab_token: settings.wab_token,
        show_success_modal: true,
        verify_token: settings.verify_token,
        business_account_id: settings.business_account_id,
        subscription_id: settings.subscriptionId,
        department_id: settings.department_id,
        departments: departments,
        brand_name: BRAND_NAME
      };
      var html = template(replacements);
      res.send(html);
    });
  } else {
    const tdClient = new TiledeskSubscriptionClient({
      API_URL: API_URL,
      project_id: project_id,
      token: token,
    });

    const subscription_info = {
      target: BASE_URL + "/tiledesk",
      event: "message.create.request.channel.whatsapp",
    };

    /*
    // callback
    await tdClient.subscribe(project_id, data, (err, data) => {
      // code here
    }) 
    */

    // promise
    tdClient
      .subscribe(subscription_info)
      .then((data) => {
        let subscription = data;
        winston.debug("\n(wab) Subscription: ", subscription);

        let settings = {
          project_id: project_id,
          token: token,
          proxy_url: proxy_url,
          subscriptionId: subscription._id,
          secret: subscription.secret,
          wab_token: wab_token,
          verify_token: verify_token,
          business_account_id: business_account_id,
          department_id: department_id,
        };

        db.set(CONTENT_KEY, settings);
        //let cnt = db.get(CONTENT_KEY);

        readHTMLFile("/configure.html", (err, html) => {
          var template = handlebars.compile(html);
          var replacements = {
            app_version: pjson.version,
            project_id: project_id,
            token: token,
            proxy_url: proxy_url,
            show_success_modal: true,
            wab_token: settings.wab_token,
            verify_token: settings.verify_token,
            business_account_id: settings.business_account_id,
            subscription_id: settings.subscriptionId,
            department_id: settings.department_id,
            departments: departments,
            brand_name: BRAND_NAME
          };
          var html = template(replacements);
          res.send(html);
        });
      })
      .catch((err) => {
        readHTMLFile("/configure.html", (err, html) => {
          var template = handlebars.compile(html);
          var replacements = {
            app_version: pjson.version,
            project_id: project_id,
            token: token,
            proxy_url: proxy_url,
            departments: departments,
            show_error_modal: true,
            brand_name: BRAND_NAME
          };
          var html = template(replacements);
          res.send(html);
        });
      });
  }
});

router.post("/disconnect", async (req, res) => {
  winston.verbose("(wab) /disconnect");

  let project_id = req.body.project_id;
  let token = req.body.token;
  let subscriptionId = req.body.subscription_id;

  let CONTENT_KEY = "whatsapp-" + project_id;
  await db.remove(CONTENT_KEY);
  winston.verbose("(wab) Content deleted.");

  let proxy_url = BASE_URL + "/webhook/" + project_id;

  const tdClient = new TiledeskSubscriptionClient({
    API_URL: API_URL,
    project_id: project_id,
    token: token,
  });
  // get departments
  const tdChannel = new TiledeskChannel({
    settings: { project_id: project_id, token: token },
    API_URL: API_URL,
  });
  let departments = await tdChannel.getDepartments(token);

  /*
  // callback
  tdClient.unsubsribe(project_id, subscriptionId, (err, data) => {
    // code here
  })
  */

  tdClient
    .unsubscribe(subscriptionId)
    .then((data) => {
      readHTMLFile("/configure.html", (err, html) => {
        var template = handlebars.compile(html);
        var replacements = {
          app_version: pjson.version,
          project_id: project_id,
          token: token,
          proxy_url: proxy_url,
          departments: departments,
          brand_name: BRAND_NAME
        };
        var html = template(replacements);
        res.send(html);
      });
    })
    .catch((err) => {
      winston.error("(wab) unsubscribe error: " + err);
    });
});

router.get("/direct/tiledesk", async (req, res) => {
  winston.verbose("/direct/tiledesk");

  let project_id = req.query.project_id;
  let whatsapp_receiver = req.query.whatsapp_receiver;
  let phone_number_id = req.query.phone_number_id;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  let tiledeskChannelMessage = {
    text: "Sample text",
    attributes: {
      attachment: {
        type: "wa_template",
        template: {
          language: "en_US",
          name: "hello_world",
        },
      },
    },
  };
  const tlr = new TiledeskWhatsappTranslator();
  const twClient = new TiledeskWhatsapp({
    token: settings.wab_token,
    GRAPH_URL: GRAPH_URL,
    API_URL: API_URL,
    BASE_FILE_URL: BASE_FILE_URL,
  });

  let whatsappJsonMessage = await tlr.toWhatsapp(
    tiledeskChannelMessage,
    whatsapp_receiver
  );
  winston.verbose("(wab) whatsappJsonMessage", whatsappJsonMessage);

  twClient
    .sendMessage(phone_number_id, whatsappJsonMessage)
    .then((response) => {
      winston.verbose(
        "(wab) Message sent to WhatsApp! " +
        response.status +
        " " +
        response.statusText
      );
    })
    .catch((err) => {
      winston.error("(wab) error send message: ", err);
      return res.status(400).send({ success: false, error: err });
    });

  res.status(200).send("Message sent");
});

router.post("/tiledesk/broadcast", async (req, res) => {
  winston.verbose("(wab) Message received from Tiledesk (Broadcast)");

  let tiledeskChannelMessage = req.body.payload;
  winston.verbose("(wab) tiledeskChannelMessage: ", tiledeskChannelMessage);
  let project_id = req.body.payload.id_project;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res
      .status(400)
      .send({
        success: false,
        error: "WhatsApp is not installed for the project_id: " + project_id,
      });
  }

  if (!settings.business_account_id) {
    return res
      .status(400)
      .send({
        success: false,
        error:
          "Missing parameter 'WhatsApp Business Account ID'. Please update your app.",
      });
  }

  let receiver_list = req.body.receiver_list;
  let phone_number_id = req.body.phone_number_id;

  let tm = new TemplateManager({
    token: settings.wab_token,
    business_account_id: settings.business_account_id,
    GRAPH_URL: GRAPH_URL,
  });
  const tlr = new TiledeskWhatsappTranslator();
  const twClient = new TiledeskWhatsapp({
    token: settings.wab_token,
    GRAPH_URL: GRAPH_URL,
    API_URL: API_URL,
    BASE_FILE_URL: BASE_FILE_URL,
  });

  let response = await tm.getTemplates();
  let templates = response.data;

  let selected_template = templates.find(
    (t) => t.name === tiledeskChannelMessage.attributes.attachment.template.name
  );

  let params_object = await tm.generateParamsObject(selected_template);

  tiledeskChannelMessage.attributes.attachment.template.params = params_object;
  winston.verbose("(wab) --> tiledeskChannelMessage: ", tiledeskChannelMessage);

  let messages_sent = 0;
  let errors = [];
  let error_count = 0;

  if (receiver_list) {
    let i = 0;
    async function execute(whatsapp_receiver) {
      let customTiledeskJsonMessage = await tlr.sanitizeTiledeskMessage(
        tiledeskChannelMessage,
        whatsapp_receiver
      );
      winston.info("customTiledeskJsonMessage: ", customTiledeskJsonMessage);

      let whatsappJsonMessage = await tlr.toWhatsapp(
        customTiledeskJsonMessage,
        whatsapp_receiver.phone_number
      );
      winston.verbose(
        "(wab) message created for receiver: " + whatsapp_receiver.phone_number
      );
      winston.verbose("(wab) whatsappJsonMessage", whatsappJsonMessage);

      await twClient
        .sendMessage(phone_number_id, whatsappJsonMessage)
        .then((response) => {
          winston.verbose(
            "(wab) Message sent to WhatsApp! " +
            response.status +
            " " +
            response.statusText
          );
          messages_sent += 1;
          i += 1;
          if (i < receiver_list.length) {
            execute(receiver_list[i]);
          } else {
            winston.debug("(wab) End of list");
            return res
              .status(200)
              .send({
                success: true,
                message: "Broadcast terminated",
                messages_sent: messages_sent,
                errors: errors,
              });
          }
        })
        .catch((err) => {
          winston.error(
            "(wab) error send message: " + err.response.data.error.message
          );
          errors.push({
            receiver: whatsapp_receiver.phone_number,
            error: err.response.data.error.message,
          });
          i += 1;
          if (i < receiver_list.length) {
            execute(receiver_list[i]);
          } else {
            winston.debug("(wab) End of list");
            return res
              .status(200)
              .send({
                success: true,
                message: "Broadcast terminated",
                messages_sent: messages_sent,
                errors: errors,
              });
          }
        });
    }
    execute(receiver_list[0]);
  }
});

/*
router.post('/tiledesk/broadcast2', async (req, res) => {

  winston.verbose("(wab) Message received from Tiledesk (Broadcast)");

  let tiledeskChannelMessage = req.body.payload;
  winston.verbose("(wab) tiledeskChannelMessage: ", tiledeskChannelMessage)
  let project_id = req.body.payload.id_project;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res.status(400).send({ success: false, error: "WhatsApp is not installed for the project_id: " + project_id });
  }

  let receiver_list = req.body.receiver_list;
  let phone_number_id = req.body.phone_number_id;

  if (!tiledeskChannelMessage.attributes.attachment.template) {
    return res.status(400).send({ success: false, error: "Message must contain a template." })
  }

  const tlr = new TiledeskWhatsappTranslator();
  const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL, API_URL: API_URL, BASE_FILE_URL: BASE_FILE_URL });

  let messages_sent = 0;
  let errors = [];
  let error_count = 0;

  if (receiver_list) {
    let i = 0;
    async function execute(whatsapp_receiver) {

      let customTiledeskJsonMessage = await tlr.sanitizeTiledeskMessage(tiledeskChannelMessage, whatsapp_receiver)
      winston.info("customTiledeskJsonMessage: ", customTiledeskJsonMessage)

      let whatsappJsonMessage = await tlr.toWhatsapp(customTiledeskJsonMessage, whatsapp_receiver.phone_number);
      winston.verbose("(wab) message created for receiver: " + whatsapp_receiver.phone_number);
      winston.verbose("(wab) whatsappJsonMessage", whatsappJsonMessage);

      //winston.debug("(wab) End of list")
      //return res.sendStatus(200);

      await twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
        winston.verbose("(wab) Message sent to WhatsApp! " + response.status + " " + response.statusText);
        messages_sent += 1;
        i += 1;
        if (i < receiver_list.length) {
          execute(receiver_list[i])
        } else {
          return res.status(200).send({ success: true, message: "Broadcast terminated", messages_sent: messages_sent, errors: errors });
          winston.debug("(wab) End of list")
        }
      }).catch((err) => {
        winston.error("(wab) error send message: " + err.response.data.error.message);
        errors.push({ receiver: whatsapp_receiver.phone_number, error: err.response.data.error.message });
        i += 1;
        if (i < receiver_list.length) {
          execute(receiver_list[i])
        } else {
          winston.debug("(wab) End of list")
          return res.status(200).send({ success: true, message: "Broadcast terminated", messages_sent: messages_sent, errors: errors });
        }
      })
    }
    execute(receiver_list[0]);
  }
})
*/

router.post("/tiledesk", async (req, res) => {
  winston.verbose("(wab) Message received from Tiledesk");

  var tiledeskChannelMessage = req.body.payload;
  winston.debug("(wab) tiledeskChannelMessage: ", tiledeskChannelMessage);
  var project_id = req.body.payload.id_project;

  // get settings from mongo
  let CONTENT_KEY = "whatsapp-" + project_id;
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

  if (attributes && attributes.subtype === "private") {
    winston.verbose("(wab) Skip subtype (private)");
    return res.sendStatus(200);
  }

  if (attributes && attributes.subtype === "info/support") {
    winston.verbose("(wab) Skip subtype: " + attributes.subtype);
    return res.sendStatus(200);
  }

  let recipient_id = tiledeskChannelMessage.recipient;
  let sender = tiledeskChannelMessage.sender;
  let whatsapp_receiver = recipient_id.substring(
    recipient_id.lastIndexOf("-") + 1
  );

  let phone_number_id;
  if (attributes && attributes.whatsapp_phone_number_id) {
    phone_number_id = attributes.whatsapp_phone_number_id;
  } else {
    phone_number_id = recipient_id.substring(
      recipient_id.lastIndexOf("wab-") + 4,
      recipient_id.lastIndexOf("-")
    );
  }

  if (!phone_number_id) {
    return res.status(400).send({ success: false, message: "Phone number id undefined" });
  }

  /*
  if (settings.expired && 
      settings.expired === true) {
    winston.info("settings expired: " + settings.expired);
        return res.status(200).send({ success: 'false', message: "plan expired"})
      
  */

  // Return an info message option
  if (settings.expired && settings.expired === true) {
    winston.verbose("settings expired: " + settings.expired);
    let tiledeskJsonMessage = {
      text: "Expired. Upgrade Plan.",
      sender: "system",
      senderFullname: "System",
      attributes: {
        subtype: "info",
      },
      channel: { name: "whatsapp" },
    };
    let message_info = {
      channel: "whatsapp",
      whatsapp: {
        from: whatsapp_receiver,
        phone_number_id: phone_number_id,
      },
    };

    const tdChannel = new TiledeskChannel({
      settings: settings,
      API_URL: API_URL,
    });
    const response = await tdChannel.send(
      tiledeskJsonMessage,
      message_info,
      settings.department_id
    );
    winston.verbose("(wab) Expiration message sent to Tiledesk");
    console.log(">>>> return 1")
    return res.sendStatus(200);
  }

  winston.debug("(wab) text: " + text);
  winston.debug("(wab) attributes: " + attributes);
  winston.debug("(wab) tiledesk sender_id: " + sender_id);
  winston.debug("(wab) recipient_id: " + recipient_id);
  winston.debug("(wab) whatsapp_receiver: " + whatsapp_receiver);
  winston.debug("(wab) phone_number_id: " + phone_number_id);

  const messageHandler = new MessageHandler({
    tiledeskChannelMessage: tiledeskChannelMessage,
  });
  const tlr = new TiledeskWhatsappTranslator();

  if (commands) {
    let i = 0;
    async function execute(command) {
      // message
      if (command.type === "message") {
        let tiledeskCommandMessage = await messageHandler.generateMessageObject(
          command
        );
        winston.debug(
          "(wab) message generated from command: ",
          tiledeskCommandMessage
        );

        let whatsappJsonMessage = await tlr.toWhatsapp(
          tiledeskCommandMessage,
          whatsapp_receiver
        );
        winston.verbose("(wab) whatsappJsonMessage", whatsappJsonMessage);

        if (whatsappJsonMessage) {
          const twClient = new TiledeskWhatsapp({
            token: settings.wab_token,
            GRAPH_URL: GRAPH_URL,
            API_URL: API_URL,
            BASE_FILE_URL: BASE_FILE_URL,
          });
          twClient
            .sendMessage(phone_number_id, whatsappJsonMessage)
            .then((response) => {
              winston.verbose("(wab) Message sent to WhatsApp! " + response.status + " " + response.statusText);
              i += 1;
              if (i < commands.length) {
                execute(commands[i]);
              } else {
                winston.debug("(wab) End of commands");
              }
            })
            .catch((err) => {
              winston.error("(wab) send message error: ", err);
            });
        } else {
          winston.error("(wab) WhatsappJsonMessage is undefined!");
        }
      }

      //wait
      if (command.type === "wait") {
        setTimeout(() => {
          i += 1;
          if (i < commands.length) {
            execute(commands[i]);
          } else {
            winston.debug("(wab) End of commands");
          }
        }, command.time);
      }
    }
    execute(commands[0]);

  } else if (tiledeskChannelMessage.text || tiledeskChannelMessage.metadata) {
    let whatsappJsonMessage = await tlr.toWhatsapp(
      tiledeskChannelMessage,
      whatsapp_receiver
    );
    winston.verbose("(wab) whatsappJsonMessage", whatsappJsonMessage);

    if (whatsappJsonMessage) {
      const twClient = new TiledeskWhatsapp({
        token: settings.wab_token,
        GRAPH_URL: GRAPH_URL,
        API_URL: API_URL,
        BASE_FILE_URL: BASE_FILE_URL,
      });

      twClient
        .sendMessage(phone_number_id, whatsappJsonMessage)
        .then((response) => {
          winston.verbose("(wab) Message sent to WhatsApp! " + response.status + " " + response.statusText);
          console.log(">>>> return 2")
          return res.sendStatus(200);
        })
        .catch((err) => {
          winston.error("(wab) error send message: ", err);
          console.log(">>>> return 3")
          return res.status(400).send({ success: false, error: "Template not existing" });
        });
    } else {
      winston.error("(wab) Whatsapp Json Message is undefined!");
      console.log(">>>> return 4")
      return res.status(400).send({ success: false, error: "An error occurred during message translation" });
    }
  } else {
    winston.debug("(wab) no command, no text --> skip");
    console.log(">>>> return 5")
    return res.sendStatus(400).send({ success: false, error: "No command or text specified. Skip message." });
  }
  
  console.log(">>>> return 6")
  return res.sendStatus(200);

});

// Endpoint for Whatsapp Business
// Accepts POST requests at /webhook endpoint
router.post("/webhook/:project_id", async (req, res) => {
  // Parse the request body from the POST
  let project_id = req.params.project_id;
  winston.verbose("(wab) Message received from WhatsApp");

  // Check the Incoming webhook message
  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {

    let CONTENT_KEY = "whatsapp-" + project_id;
    let settings = await db.get(CONTENT_KEY);
    winston.debug("(wab) settings: ", settings);

    const tdClient = new TiledeskClient({
      projectId: project_id,
      token: settings.token,
      APIURL: API_URL,
      APIKEY: "___",
      log: false,
    });

    const wl = new WhatsappLogger({ tdClient: tdClient });
    wl.forwardMessage(req.body);

    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      if (req.body.entry[0].changes[0].value.messages[0].type == "system") {
        winston.verbose("(wab) Skip system message");
        return res.sendStatus(200);
      }

      let whatsappChannelMessage =
        req.body.entry[0].changes[0].value.messages[0];

      /*
      let CONTENT_KEY = "whatsapp-" + project_id;
      let settings = await db.get(CONTENT_KEY);
      winston.debug("(wab) settings: ", settings);
      */

      if (!settings) {
        winston.verbose("(wab) No settings found. Exit..");
        return res.sendStatus(200);
      }

      const tlr = new TiledeskWhatsappTranslator();
      const tdChannel = new TiledeskChannel({
        settings: settings,
        API_URL: API_URL,
      });

      // Initialize conversation with chatbot
      if (
        whatsappChannelMessage.text &&
        whatsappChannelMessage.text.body.startsWith("#td")
      ) {
        let code = whatsappChannelMessage.text.body.split(" ")[0];

        const bottester = new TiledeskBotTester({
          project_id: project_id,
          redis_client: redis_client,
          db: db,
          tdChannel: tdChannel,
          tlr: tlr,
        });
        bottester
          .startBotConversation(req.body, code)
          .then((result) => {
            winston.verbose("(wab) test conversation started");
            winston.debug("(wab) startBotConversation result: ", result);
          })
          .catch((err) => {
            winston.error("(wab) start test onversation error: ", err);
          });

        // Standard message
      } else {
        let firstname =
          req.body.entry[0].changes[0].value.contacts[0].profile.name;

        let message_info = {
          channel: "whatsapp",
          whatsapp: {
            phone_number_id:
              req.body.entry[0].changes[0].value.metadata.phone_number_id,
            from: req.body.entry[0].changes[0].value.messages[0].from,
            firstname:
              req.body.entry[0].changes[0].value.contacts[0].profile.name,
            lastname: " ",
          },
        };

        let tiledeskJsonMessage;

        /*
        if ((whatsappChannelMessage.type == 'text')) {
          winston.debug("(wab) message type: text")
          tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname);
        }

        else if (whatsappChannelMessage.type == 'interactive') {
          winston.debug("(wab) message type: interactive")
          tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, firstname);
        }

        else if ((whatsappChannelMessage.type == 'image') || (whatsappChannelMessage.type == 'video') || (whatsappChannelMessage.type == 'document') || (whatsappChannelMessage.type == 'audio')) {
          let media;
          const util = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL, API_URL: API_URL, BASE_FILE_URL: BASE_FILE_URL })

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

          if (whatsappChannelMessage.type == 'audio') {
            media = whatsappChannelMessage.audio;

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
        */

        ////////////////////////////////////////////////////

        if (
          whatsappChannelMessage.type == "image" ||
          whatsappChannelMessage.type == "video" ||
          whatsappChannelMessage.type == "document" ||
          whatsappChannelMessage.type == "audio"
        ) {
          let media;
          const util = new TiledeskWhatsapp({
            token: settings.wab_token,
            GRAPH_URL: GRAPH_URL,
            API_URL: API_URL,
            BASE_FILE_URL: BASE_FILE_URL,
          });

          if (whatsappChannelMessage.type == "image") {
            media = whatsappChannelMessage.image;
            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug(
                "(wab) Unable to download media with id " +
                media.id +
                ". Message not sent."
              );
              return res
                .status(500)
                .send({ success: false, error: "unable to download media" });
            }
            let file_path = path.join(__dirname, "tmp", filename);

            const image_url = await util.uploadMedia(file_path, "images");
            winston.debug("(wab) image_url: " + image_url);

            tiledeskJsonMessage = await tlr.toTiledesk(
              whatsappChannelMessage,
              firstname,
              image_url
            );
          }

          if (whatsappChannelMessage.type == "video") {
            media = whatsappChannelMessage.video;

            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug(
                "(wab) Unable to download media with id " +
                media.id +
                ". Message not sent."
              );
              return res
                .status(500)
                .send({ success: false, error: "unable to download media" });
            }
            let file_path = path.join(__dirname, "tmp", filename);

            const media_url = await util.uploadMedia(file_path, "files");
            winston.debug("(wab) media_url: " + media_url);

            tiledeskJsonMessage = await tlr.toTiledesk(
              whatsappChannelMessage,
              firstname,
              media_url
            );
          }

          if (whatsappChannelMessage.type == "document") {
            media = whatsappChannelMessage.document;

            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug(
                "(wab) Unable to download media with id " +
                media.id +
                ". Message not sent."
              );
              return res
                .status(500)
                .send({ success: false, error: "unable to download media" });
            }
            let file_path = path.join(__dirname, "tmp", filename);

            const media_url = await util.uploadMedia(file_path, "files");
            winston.debug("(wab) media_url: " + media_url);

            tiledeskJsonMessage = await tlr.toTiledesk(
              whatsappChannelMessage,
              firstname,
              media_url
            );
          }

          if (whatsappChannelMessage.type == "audio") {
            media = whatsappChannelMessage.audio;

            const filename = await util.downloadMedia(media.id);
            if (!filename) {
              winston.debug(
                "(wab) Unable to download media with id " +
                media.id +
                ". Message not sent."
              );
              return res
                .status(500)
                .send({ success: false, error: "unable to download media" });
            }
            let file_path = path.join(__dirname, "tmp", filename);

            const media_url = await util.uploadMedia(file_path, "files");
            winston.debug("(wab) media_url: " + media_url);

            tiledeskJsonMessage = await tlr.toTiledesk(
              whatsappChannelMessage,
              firstname,
              media_url
            );
          }
        } else {
          winston.debug("(wab) message type: ", whatsappChannelMessage.type);
          tiledeskJsonMessage = await tlr.toTiledesk(
            whatsappChannelMessage,
            firstname
          );
        }

        if (tiledeskJsonMessage) {
          winston.verbose("(wab) tiledeskJsonMessage: ", tiledeskJsonMessage);
          const response = await tdChannel.send(
            tiledeskJsonMessage,
            message_info,
            settings.department_id
          );
          winston.verbose("(wab) Message sent to Tiledesk!");
          winston.debug("(wab) response: ", response);
        } else {
          winston.verbose("(wab) tiledeskJsonMessage is undefined");
        }
      }
    }

    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.statuses &&
      req.body.entry[0].changes[0].value.statuses[0]
    ) {
      let whatsappStatusMessage =
        req.body.entry[0].changes[0].value.statuses[0];
      winston.verbose("(wab) whatsappStatusMessage: ", whatsappStatusMessage);

      let message_id = whatsappStatusMessage.id;
      let status = whatsappStatusMessage.status;
      let error = null;
      if (whatsappStatusMessage.errors) {
        error = whatsappStatusMessage.errors[0].title;
      }
      winston.verbose(
        "(wab) update status in " + status + " for message_id " + message_id
      );

      /*
      let CONTENT_KEY = "whatsapp-" + project_id;
      let settings = await db.get(CONTENT_KEY);
      winston.debug("(wab) settings: ", settings);
      */

      const tdClient = new TiledeskClient({
        projectId: project_id,
        token: settings.token,
        APIURL: API_URL,
        APIKEY: "___",
        log: false,
      });

      const wl = new WhatsappLogger({ tdClient: tdClient });
      wl.updateMessageStatus(message_id, status, error);
    }

    res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    winston.verbose("(wab) event not from whatsapp");
    res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
router.get("/webhook/:project_id", async (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
   */
  winston.verbose("(wab) Verify the webhook... ");
  winston.debug("(wab) req.query: " + req.query);

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  let CONTENT_KEY = "whatsapp-" + req.params.project_id;

  let settings = await db.get(CONTENT_KEY);

  if (!settings || !settings.verify_token) {
    winston.error("(wab) No settings found! Unable to verify token.");
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
      res
        .status(400)
        .send("impossible to verify the webhook: mode or token undefined.");
    }
  }
});

router.post("/newtest", async (req, res) => {
  winston.verbose("(wab) initializing new test..");

  let project_id = req.body.project_id;
  let bot_id = req.body.bot_id;

  let info = {
    project_id: project_id,
    bot_id: bot_id,
  };

  let short_uid = uuidv4().substring(0, 8);
  let key = "bottest:" + short_uid;

  if (!redis_client) {
    return res
      .status(500)
      .send({
        message: "Test it out on Whatsapp not available. Redis not ready.",
      });
  }

  await redis_client.set(key, JSON.stringify(info), "EX", 604800);
  redis_client.get(key, (err, value) => {
    if (err) {
      winston.error("(wab) redis get err: ", err);
      return res
        .status(500)
        .send({ success: "false", message: "Testing info could not be saved" });
    } else {
      winston.debug("(wab) new test initialized with id: " + short_uid);
      return res.status(200).send({ short_uid: short_uid });
    }
  });
});

router.get("/templates/detail", async (req, res) => {
  let project_id = req.query.project_id;
  let token = req.query.token;
  let app_id = req.query.app_id;
  let template_id = req.query.id_template;
  winston.debug("get template_id: " + template_id);

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);
  winston.debug("(wab) settings: ", settings);

  if (settings) {
    // forse non serve, comunque non si può prendere un singolo template
    /*
    let tm = new TemplateManager({ token: settings.wab_token, business_account_id: settings.business_account_id, GRAPH_URL: GRAPH_URL })
    let templates_info = await tm.getTemplateNamespace();
    let namespace = templates_info.message_template_namespace;
    let template = await tm.getTemplateById(namespace);
    */
    let tm = new TemplateManager({
      token: settings.wab_token,
      business_account_id: settings.business_account_id,
      GRAPH_URL: GRAPH_URL,
    });
    let templates = await tm.getTemplates();
    let template = JSON.parse(
      JSON.stringify(templates.data.find((t) => t.id === template_id))
    );
    let template_name = template.name;

    let template_copy = {
      name: template.name,
      components: template.components,
      language: template.language,
      status: template.status,
      id: template.id,
      category: template.category,
    };

    readHTMLFile("/template_detail.html", (err, html) => {
      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        app_id: app_id,
        name: template_name,
        template: template_copy,
      };
      var html = template(replacements);
      res.send(html);
    });
  } else {
    return res.send("whatsapp not installed on this project");
  }
});

router.get("/templates/:project_id", async (req, res) => {
  winston.verbose("(wab) /templates");

  let project_id = req.params.project_id;
  let token = req.query.token;
  let app_id = req.query.app_id;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);
  winston.debug("(wab) settings: ", settings);

  if (settings) {
    let tm = new TemplateManager({
      token: settings.wab_token,
      business_account_id: settings.business_account_id,
      GRAPH_URL: GRAPH_URL,
    });
    let templates = await tm.getTemplates();

    readHTMLFile("/templates.html", (err, html) => {
      var template = handlebars.compile(html);
      var replacements = {
        app_version: pjson.version,
        project_id: project_id,
        token: token,
        app_id: app_id,
        templates: templates.data,
      };
      var html = template(replacements);
      res.send(html);
    });
  } else {
    winston.verbose("No settings found.");
    return res
      .status(404)
      .send({
        success: false,
        error: "whatsapp not installed for the project id " + project_id,
      });
  }
});

/*
router.get("/ext/templates/:project_id", async (req, res) => {
  winston.verbose("(wab) /ext/templates");

  let project_id = req.params.project_id;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (settings) {

    if (settings.business_account_id) {
      let tm = new TemplateManager({ token: settings.wab_token, business_account_id: settings.business_account_id, GRAPH_URL: GRAPH_URL })
      let templates = await tm.getTemplates();
      if (templates) {
        res.status(200).send(templates.data);
      } else {
        res.status(500).send({ success: false, code: '02', message: "A problem occurred while getting templates from WhatsApp" })
      }

    } else {
      res.status(500).send({ success: false, code: '03', message: "Missing parameter 'WhatsApp Business Account ID'. Please update your app." })
    }

  } else {
    res.status(400).send({ success: false, code: '01', message: "WhatsApp not installed for the project_id " + project_id })
  }

})
*/

//router.delete("/ext/")

/*
router.get("/ext/:project_id", async (req, res) => {
  winston.verbose("(wab) /ext/");

  let project_id = req.params.project_id;
  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res.status(200).send({ success: false, message: "WhatsApp not installed for the project_id " + project_id })
  }
  return res.status(200).send({ success: true, settings: settings })
})
*/

// *****************************
// ********* FUNCTIONS *********
// *****************************

async function startApp(settings, callback) {
  winston.info("(wab) Starting Whatsapp App");

  if (!settings.MONGODB_URL) {
    winston.error("(wab) MONGODB_URL is mandatory. Exit...");
    return callback("Missing parameter: MONGODB_URL");
  }

  if (!settings.API_URL) {
    winston.error("(wab) API_URL is mandatory. Exit...");
    return callback("Missing parameter: API_URL");
  } else {
    API_URL = settings.API_URL;
    winston.info("(wab) API_URL: " + API_URL);
  }

  if (!settings.BASE_FILE_URL) {
    winston.error("(wab) BASE_FILE_URL is mandatory. Exit...");
    return callback("Missing parameter: BASE_FILE_URL");
  } else {
    BASE_FILE_URL = settings.BASE_FILE_URL;
    winston.info("(wab) BASE_FILE_URL: " + BASE_FILE_URL);
  }

  if (!settings.BASE_URL) {
    winston.error("(wab) BASE_URL is mandatory. Exit...");
    return callback("Missing parameter: BASE_URL");
  } else {
    BASE_URL = settings.BASE_URL;
    winston.info("(wab) BASE_URL: " + BASE_URL);
  }

  if (!settings.GRAPH_URL) {
    winston.error("(wab) GRAPH_URL is mandatory. Exit...");
    return callback("Missing parameter: GRAPH_URL");
  } else {
    GRAPH_URL = settings.GRAPH_URL;
    winston.info("(wab) GRAPH_URL: " + GRAPH_URL);
  }

  if (!settings.APPS_API_URL) {
    winston.error("(wab) APPS_API_URL is mandatory. Exit...");
    return callback("Missing parameter: APPS_API_URL");
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
    winston.info(
      "(wab) Missing redis parameters --> Test it out on WhatsApp disabled"
    );
  }

  if (!settings.AMQP_MANAGER_URL) {
    winston.error("(wab) AMQP_MANAGER_URL is mandatory (?). Exit...");
  } else {
    AMQP_MANAGER_URL = settings.AMQP_MANAGER_URL;
    winston.info("(wab) AMQP_MANAGER_URL is present");
  }

  if (!settings.JOB_TOPIC_EXCHANGE) {
    winston.info("(wab) JOB_TOPIC_EXCHANGE should be present. Using default value");
    JOB_TOPIC_EXCHANGE = "tiledesk-whatsapp";
  } else {
    JOB_TOPIC_EXCHANGE = settings.JOB_TOPIC_EXCHANGE;
    winston.info("(wab) JOB_TOPIC_EXCHANGE is present");
  }
  
  if (settings.BRAND_NAME) {
    BRAND_NAME = settings.BRAND_NAME
  }
  
  // // For test only
  // if (settings.LOG_MONGODB_URL) {
  //   /**
  //    * Connect with a different Database
  //    */
  //   mongoose
  //    .connect(settings.LOG_MONGODB_URL)
  //    .then(() => {
  //      winston.info("Mongoose DB Connected");
  //    })
  //    .catch((err) => {
  //      winston.error("(Mongoose) Unable to connect with MongoDB ", err);
  //    });
  // }

  let LOG_MONGODB_URL;
  if (!settings.LOG_MONGODB_URL) {
    LOG_MONGODB_URL = settings.MONGODB_URL;
  } else {
    LOG_MONGODB_URL = settings.LOG_MONGODB_URL;
  }

  mongoose
    .connect(LOG_MONGODB_URL)
    .then(() => {
      winston.info("Mongoose DB Connected");
    })
    .catch((err) => {
      winston.error("(Mongoose) Unable to connect with MongoDB ", err);
    });

  if (settings.dbconnection) {
    db.reuseConnection(settings.dbconnection, () => {
      winston.info("(wab) KVBaseMongo reused exsisting db connection");
      if (callback) {
        callback(null);
      }
    })
  } else {
    db.connect(settings.MONGODB_URL, () => {
      winston.info("(wab) KVBaseMongo successfully connected.");
  
      if (callback) {
        callback(null);
      }
    });
  }

  api.startRoute(
    {
      DB: db,
      API_URL: API_URL,
      GRAPH_URL: GRAPH_URL,
      BASE_FILE_URL: BASE_FILE_URL,
      AMQP_MANAGER_URL: AMQP_MANAGER_URL,
      JOB_TOPIC_EXCHANGE: JOB_TOPIC_EXCHANGE,
    },
    (err) => {
      if (!err) {
        winston.info("(wab) API route successfully started.");
      } else {
        winston.info("(wab) Unable to start API route.");
      }
    }
  );
}

function connectRedis() {
  redis_client = redis.createClient({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
  });

  redis_client.on("error", (err) => {
    winston.info("(wab) Connect Redis Error " + err);
  });
  /*
  redis_client.on('connect', () => {
    winston.info('Redis Connected!'); // Connected!
  });
  */
  redis_client.on("ready", () => {
    winston.info("(wab) Redis ready!");
  });
  //await redis_client.connect(); // only for v4
}

function readHTMLFile(templateName, callback) {
  fs.readFile(
    __dirname + "/template" + templateName,
    { encoding: "utf-8" },
    function (err, html) {
      if (err) {
        throw err;
        //callback(err);
      } else {
        callback(null, html);
      }
    }
  );
}

module.exports = { router: router, startApp: startApp };
