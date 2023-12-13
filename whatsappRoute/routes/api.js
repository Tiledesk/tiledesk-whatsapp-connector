const { json } = require('body-parser');
const jwt = require('jsonwebtoken');
const express = require('express');
var winston = require('../winston');
const router = express.Router({ mergeParams: true });

const { TemplateManager } = require('../tiledesk/TemplateManager');
const { TiledeskWhatsappTranslator } = require('../tiledesk/TiledeskWhatsappTranslator');
const { TiledeskWhatsapp } = require('../tiledesk/TiledeskWhatsapp');
const { Scheduler } = require('../tiledesk/Scheduler');

let db = null;
let API_URL = null;
let GRAPH_URL = null;
let BASE_FILE_URL = null;
//let ACCESS_TOKEN_SECRET = null;
let AMQP_MANAGER_URL = null;

router.get('/', async (req, res) => {
  res.status(200).send({ message: "API route works" })
})



router.get('/disconnect/:project_id', async (req, res) => {

  let project_id = req.params.project_id;
  let CONTENT_KEY = "whatsapp-" + project_id;

  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res.status(200).send({ success: false, message: "Unable to find content for the projectId " + project_id })
  }

  if (req.query.ghost && req.query.ghost === 'true') {
    settings.trashed = true;
    await db.set(CONTENT_KEY, settings);
    winston.verbose("(wab) Content deleted.");
    res.status(200).send({ success: true, message: "Disconnected" });

  } else {
    await db.remove(CONTENT_KEY);
    winston.verbose("(wab) Content deleted.");
    res.status(200).send({ success: true, message: "Disconnected" });
  }

})

router.post('/customer/io', async (req, res) => {
  winston.verbose("Event received from customer.io");
  winston.debug("Body (customer.io): ", req.body);

  let tiledeskChannelMessage = req.body;

  let project_id = req.body.id_project;

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res.status(500).send({ success: false, message: "WhatsApp not installed for the projectId: " + project_id });
  }

  const tlr = new TiledeskWhatsappTranslator();

  let receiver = tiledeskChannelMessage.receiver_phone_number;
  let phone_number_id = tiledeskChannelMessage.phone_number_id;

  let whatsappJsonMessage = await tlr.toWhatsapp(tiledeskChannelMessage, receiver);
  winston.debug("[ CUSTOMER.IO ] whatsappJsonMessage: ", JSON.stringify(whatsappJsonMessage, null, 2));

  if (whatsappJsonMessage) {
    const twClient = new TiledeskWhatsapp({ token: settings.wab_token, GRAPH_URL: GRAPH_URL, API_URL: API_URL, BASE_FILE_URL: BASE_FILE_URL });

    twClient.sendMessage(phone_number_id, whatsappJsonMessage).then((response) => {
      winston.verbose("(wab) Message sent to WhatsApp! " + response.status + " " + response.statusText);
      res.status(200).send({ success: true, message: "Message sent!" });
    }).catch((err) => {
      res.status(400).send({ success: false, error: err });
      winston.error("(wab) error send message: ", err.data);
    })

  } else {
    res.status(400).send({ success: false, error: "whatsappJsonMessage is undefined" });
    winston.error("(wab) error send message: ", err);
  }
})


router.get("/:project_id", async (req, res) => {
  winston.verbose("(wab) /api/project_id");

  let project_id = req.params.project_id;
  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res.status(200).send({ success: false, message: "WhatsApp not installed for the project_id " + project_id })
  }
  return res.status(200).send({ success: true, settings: settings })
})

router.get("/templates/:project_id", async (req, res) => {
  winston.verbose("(wab) /api/templates");

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

router.post('/tiledesk/broadcast', async (req, res) => {
  winston.verbose("(wab) Action received from Tiledesk (Broadcast)");
  winston.debug("Body (broadcast): ", JSON.stringify(req.body, null, 2));

  let body = req.body;

  let project_id = body.id_project;
  let receiver_list = body.receiver_list;
  let phone_number_id = body.phone_number_id;
  let template = body.template;
  let transaction_id = body.transaction_id;

  if (!transaction_id) {
    transaction_id = "tiledesk-broadcast-" + Date.now();
  }

  let CONTENT_KEY = "whatsapp-" + project_id;
  let settings = await db.get(CONTENT_KEY);

  if (!settings) {
    return res.status(400).send({ success: false, error: "WhatsApp is not installed for the project_id: " + project_id });
  }

  if (!settings.business_account_id) {
    return res.status(400).send({ success: false, error: "Missing parameter 'WhatsApp Business Account ID'. Please update your app." })
  }

  let scheduler = new Scheduler({ AMQP_MANAGER_URL: AMQP_MANAGER_URL });
  let data_To_scheduler = { 
    project_id: project_id, 
    receiver_list: receiver_list, 
    phone_number_id: phone_number_id, 
    transaction_id: transaction_id,
    template: template, 
    settings: settings 
  };
  
  winston.debug('(wab) data_To_scheduler: ', data_To_scheduler);
  
  let schedulerResult = await scheduler.goSchedule(data_To_scheduler);
  winston.verbose('(wab) schedulerResult: ', schedulerResult);

  res.status(200).send({ success: true, message: "Job started. Send messages in queue." })
})


// start api route from whatsappRoute
async function startRoute(settings, callback) {
  winston.info("(wab api) Starting api route", settings);

  if (!settings.DB) {
    winston.error("(wab api) db id mandatory. Exit...");
    return callback('Missing parameter: db');
  } else {
    db = settings.DB;
    //winston.info("(wab) db " + db);
  }

  if (!settings.GRAPH_URL) {
    winston.error("(wab api) GRAPH_URL is mandatory. Exit...");
    return callback('Missing parameter: GRAPH_URL');
  } else {
    GRAPH_URL = settings.GRAPH_URL;
    winston.info("(wab api) GRAPH_URL: " + GRAPH_URL);
  }

  if (!settings.API_URL) {
    winston.error("(wab api) API_URL is mandatory. Exit...");
    return callback('Missing parameter: API_URL');
  } else {
    API_URL = settings.API_URL;
    winston.info("(wab api) API_URL: " + API_URL);
  }

  if (!settings.BASE_FILE_URL) {
    winston.error("(wab api) BASE_FILE_URL is mandatory. Exit...");
    return callback('Missing parameter: BASE_FILE_URL');
  } else {
    BASE_FILE_URL = settings.BASE_FILE_URL;
    winston.info("(wab api) BASE_FILE_URL: " + BASE_FILE_URL);
  }

  if (!settings.ACCESS_TOKEN_SECRET) {
    winston.error("(wab api) ACCESS_TOKEN_SECRET is mandatory (?). Exit...");
  } else {
    ACCESS_TOKEN_SECRET = settings.ACCESS_TOKEN_SECRET;
    winston.info("(wab api) ACCESS_TOKEN_SECRET is present");
  }
  if (!settings.AMQP_MANAGER_URL) {
    winston.error("(wab api) AMQP_MANAGER_URL is mandatory (?). Exit...");
  } else {
    AMQP_MANAGER_URL = settings.AMQP_MANAGER_URL;
    winston.info("(wab api) AMQP_MANAGER_URL is present");
  }



}

module.exports = { router: router, startRoute: startRoute };