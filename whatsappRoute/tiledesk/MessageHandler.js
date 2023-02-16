const axios = require("axios").default;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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
    this.log = true;

  }

  async generateMessageObject(command) {
    console.log("[MessageHandler] command: ", command);
    //console.log("[MessageHandler] tiledeskChannelMessage: ", this.tiledeskChannelMessage);
    let tiledeskCommandMessage = command.message;

    tiledeskCommandMessage.recipient = this.tiledeskChannelMessage.recipient;
    
    return tiledeskCommandMessage;
  }

  generateMessageObjectOriginal(command_message) {
      let parentUid = this.tiledeskChannelMessage.uid
      //command_message.uid = this.tiledeskChannelMessage.uid + "_" + index;
      command_message.uid = this.tiledeskChannelMessage.uid;
      if(command_message.text) command_message.text = command_message.text.trim()//remove black msg with only spaces
      command_message.language = message.language;
      command_message.recipient = message.recipient;
      command_message.recipient_fullname = message.recipient_fullname;
      command_message.sender = message.sender;
      command_message.sender_fullname = message.sender_fullname;
      command_message.channel_type = message.channel_type;
      command_message.status = message.status;
      command_message.isSender = message.isSender;
      command_message.attributes? command_message.attributes.commands = true : command_message.attributes = {commands : true}
      command_message.attributes.parentUid = parentUid //added to manage message STATUS UPDATES
      command_message.attributes = {...message.attributes, ...command_message.attributes}
      //this.addedNew(command_message)
      //callback();

    return command_message
  }

  

}

module.exports = { MessageHandler }

