const axios = require("axios").default;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
var winston = require('../winston');

class MessageHandler {

  /**
    * Constructor for TiledeskChannel
    *
    * @example
    * const { TiledeskChannel } = require('tiledesk-channel');
    * const tdChannel = new TiledeskChannel({tiledeskJsonMessage: replyFromWhatsapp, settings: appSettings, whatsappJsonMessage: originalWhatsappMessage, API_URL: tiledeskApiUrl });
    * 
    * @param {Object} config JSON configuration.
    * @param {string} config.tiledeskJsonMessage Mandatory. Message translated from Whatsapp to Tiledesk
    * @param {string} config.whatsappJsonMessage Mandatory. Original whatsapp message.
    * @param {string} config.settings Mandatory. Installation settings.
    * @param {string} config.API_URL Mandatory. Tiledesk api url.
    * @param {boolean} options.log Optional. If true HTTP requests are logged.
    */
  
  constructor(config) {

    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.tiledeskChannelMessage) {
      throw new Error('config.tiledeskChannelMessage is mandatory');
    }

    this.tiledeskChannelMessage = config.tiledeskChannelMessage;
    this.log = false;
    if (config.log) {
      this.log = config.log;
    }

  }

  async generateMessageObject(command) {
      
    winston.debug("(wab) [MessageHandler] command: ", command);
    let tiledeskCommandMessage = command.message;
    tiledeskCommandMessage.recipient = this.tiledeskChannelMessage.recipient;
    
    return tiledeskCommandMessage;
  }

}

module.exports = { MessageHandler }

