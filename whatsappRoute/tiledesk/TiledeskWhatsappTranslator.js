const { v4: uuidv4 } = require('uuid');
const winston = require('../winston')

class TiledeskWhatsappTranslator {

  /**
   * Constructor for TiledeskWhatsappTranslator
   *const axios = require("axios").default;
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
   * @example
   * const { TiledeskWhatsappTranslator } = require('tiledesk-whatsapp-translator');
   * const tlr = new TiledeskWhatsappTranslator();
   * 
   * @param {Object} config JSON configuration.
   */

  static WHATSAPP_MESSAGING_PRODUCT = "whatsapp";
  static CHANNEL_NAME = "whatsapp";

  constructor() {

    /*
    if (!config.tiledeskChannelMessage) {
      throw new Error('config.tiledeskChannelMessage is mandatory');
    }
    this.tiledeskChannelMessage = config.tiledeskChannelMessage;
    */

    this.log = false;
  }
  

  /*
  *************** START ***************
  ********* WHATSAPP BUSINESS *********
  *************************************
  */

  /** Returns a Whatsapp  messagem new request ID for the specified Project.<br>
   * A request's ID has the format:<br>
   * <br>
   * <i>support-group-PROJECT_ID-UNIQUE_ID</i><br>
   * <br>
   * <i>UNIQUE_ID</i> MUST be unique in your Project. <b>This method always returns an <i>UUID</i> for the <i>UNIQUE_ID</i> component</b>.
   * 
   * @param {Object} tiledeskChannelMessage - The message in Tiledesk format.
   * @param {string} whatsapp_receiver - The Whatsapp recipient fo the message.
  */
  toWhatsapp(tiledeskChannelMessage, whatsapp_receiver) {

    winston.debug("(wab) [Translator] tiledesk message: ", tiledeskChannelMessage);

    let text = '';
    if (tiledeskChannelMessage.text) {
      text = tiledeskChannelMessage.text;
    }

    let whatsapp_message = {
      messaging_product: TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT,
      to: whatsapp_receiver,
    }

    if (tiledeskChannelMessage.type === 'frame') {
      text = text + "\n\n👉 " + tiledeskChannelMessage.metadata.src
      whatsapp_message.text = { body: text };
      return whatsapp_message
    }

    else if (tiledeskChannelMessage.metadata) {

      if ((tiledeskChannelMessage.metadata.type && tiledeskChannelMessage.metadata.type.startsWith('image')) || tiledeskChannelMessage.type.startsWith('image')) {
        var imgUrl = tiledeskChannelMessage.metadata.src;
        whatsapp_message.type = 'image'
        whatsapp_message.image = {
          link: imgUrl,
          caption: text
        }
      }

      else if ((tiledeskChannelMessage.metadata.type && tiledeskChannelMessage.metadata.type.startsWith('video')) || tiledeskChannelMessage.type.startsWith('video')) {
        var videoUrl = tiledeskChannelMessage.metadata.src;
        whatsapp_message.type = 'video'
        whatsapp_message.video = {
          link: videoUrl,
          caption: tiledeskChannelMessage.metadata.name || tiledeskChannelMessage.text
        }
      }

      else if (tiledeskChannelMessage.metadata.type.startsWith('application')) {
        //var doc = tiledeskChannelMessage.metadata.src;
        var doc = tiledeskChannelMessage.metadata.downloadURL;
        whatsapp_message.type = 'document'
        whatsapp_message.document = {
          link: doc,
          filename: tiledeskChannelMessage.metadata.name,
        }
        
        let index = tiledeskChannelMessage.text.indexOf(tiledeskChannelMessage.metadata.src);
        if (index != -1) {
          let length = tiledeskChannelMessage.metadata.src.length;
          let caption = tiledeskChannelMessage.text.substring(index + length + 2);
          whatsapp_message.document.caption = caption;
        }
        
      }

      else {
        winston.verbose("(wab) [Translator] file type not supported")
        return null
      }

      return whatsapp_message;

    } else if (tiledeskChannelMessage.attributes) {
      if (tiledeskChannelMessage.attributes.attachment) {
        if (tiledeskChannelMessage.attributes.attachment.buttons) {

          let buttons = tiledeskChannelMessage.attributes.attachment.buttons;

          let quick_replies = [];
          let option_rows = [];
          let action_rows = [];

          let buttons_count = 0;
          for (let btn of buttons) {
            if (btn.type != 'url') {
              buttons_count = buttons_count + 1;
            }
          }

          if (buttons_count == 0) {

            for (let btn of buttons) {
              if (btn.type == 'url') {
                text = text + "\n\n👉 " + btn.value + " (" + btn.link + ")"
              }
            }

            whatsapp_message.text = { body: text };
            return whatsapp_message;
          }

          if (buttons_count > 0 && buttons_count < 4) {

            for (let btn of buttons) {
              let title = (btn.value.length > 20) ? btn.value.substr(0, 18) + '..' : btn.value;

              if (btn.type == 'text') {
                let text_btn = {
                  type: "reply",
                  reply: {
                    id: "quick" + uuidv4().substring(0, 4) + "_" + btn.value,
                    title: title
                  }
                }
                quick_replies.push(text_btn);
              }

              if (btn.type == 'action') {
                let action_btn = {
                  type: "reply",
                  reply: {
                    id: "action" + uuidv4().substring(0, 4) + "_" + btn.action,
                    title: title
                  }
                }
                quick_replies.push(action_btn);
              }

              if (btn.type == 'url') {
                text = text + "\n\n👉 " + btn.value + " (" + btn.link + ")";
              }
            }

            whatsapp_message.type = "interactive";
            whatsapp_message.interactive = {
              type: "button",
              body: { text: text },
              action: { buttons: quick_replies }
            };
            return whatsapp_message;
          }

          if (buttons_count > 3 && buttons_count < 11) {

            for (let btn of buttons) {
              let title = (btn.value.length > 24) ? btn.value.substr(0, 22) + '..' : btn.value;

              if (btn.type == 'text') {
                let row = {
                  id: "quick" + uuidv4().substring(0, 4) + "_" + btn.value,
                  title: title
                }
                //option_rows.push(row);
                action_rows.push(row);
              }

              if (btn.type == 'action') {
                let row = {
                  id: "action" + uuidv4().substring(0, 4) + "_" + btn.action,
                  title: title
                }
                action_rows.push(row);
              }

              if (btn.type == 'url') {
                text = text + "\n\n👉 " + btn.value + " (" + btn.link + ")"
              }

            }

            whatsapp_message.type = "interactive";
            let sections;

            if (option_rows.length > 0 && action_rows.length > 0) {
              sections = [
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

            if (option_rows.length > 0 && action_rows.length == 0) {
              sections = [
                {
                  title: "Options",
                  rows: option_rows
                }
              ]
            }

            // only available at the moment --> all buttons are now "actions"
            if (option_rows.length == 0 && action_rows.length > 0) {
              sections = [
                {
                  //title: "Menu",
                  rows: action_rows
                }
              ]
            }

            whatsapp_message.interactive = {
              type: "list",
              body: { text: text },
              action: {
                button: "Choose an option",
                sections: sections
              }
            }
            return whatsapp_message;
          }

          if (buttons_count > 10) {
            // too many buttons
            // Option 1: Skip message
            // Option 2: Cut buttons array -> display first 10 buttons only
            // Option 3: Send message with *buttons (questa)

            whatsapp_message.text = { body: tiledeskChannelMessage.attributes._raw_message };
            return whatsapp_message;
          }

        }
        else if (tiledeskChannelMessage.attributes.attachment.template) {
          winston.debug("(wab) [Translator] template: ", tiledeskChannelMessage.attributes.attachment.template)

          let template = tiledeskChannelMessage.attributes.attachment.template;

          whatsapp_message.type = "template";
          whatsapp_message.template = {
            name: template.name,
            language: {
              code: template.language
            }
          }
          let components = [];
          if (template.params && template.params.header) {
            let component = {
              type: "header",
              parameters: template.params.header
            }
            components.push(component);
          }
          if (template.params && template.params.body) {
            let component = {
              type: "body",
              parameters: template.params.body
            }
            components.push(component);
          }
          if (template.params && template.params.buttons) {

            let component = {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: template.params.buttons
            }
            components.push(component);

            /*
            template.params.buttons.forEach((button) => {
              let component = button;
              components.push(component);
            })
            
            let component = {
              type: "button",
              sub_type: "url",
              parmeters: template.params.buttons
            }
            */
          }

          if (components.length > 0) {
            whatsapp_message.template.components = components;
          }

          return whatsapp_message;

        }
        else {

          whatsapp_message.text = { body: text };
          return whatsapp_message;
        }

      } else {

        whatsapp_message.text = { body: text };
        return whatsapp_message;
      }

    }
    else {
      // standard message
      whatsapp_message.text = { body: text };
      return whatsapp_message;
    }
  }

  async createTemplateMessage(template, receiver, params) {

    let whatsapp_message = {
      messaging_product: TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT,
      to: receiver.phone_number,
      type: "template"
    }

    whatsapp_message.template = {
      name: template.name,
      language: {
        code: template.language
      }
    }

    /*
    let params_filled = await this.fillParams(params, receiver);

    let components = [];
    if (params_filled && params_filled.header) {
      let component = {
        type: "header",
        parameters: params_filled.header
      }
      components.push(component);
    }
    if (params_filled && params_filled.body) {
      let component = {
        type: "body",
        parameters: params_filled.body
      }
      components.push(component);
    }
    if (params_filled && params_filled.buttons) {

      let component = {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: params_filled.buttons
      }
      components.push(component);
    }
    */

    let components = [];

    
    if (receiver.header_params) {
      let component = {
        type: "header",
        parameters: receiver.header_params
      }
      components.push(component);
    }
    
    if (receiver.body_params) {
      let component = {
        type: "body",
        parameters: receiver.body_params
      }
      components.push(component);
    }

    if (receiver.buttons_params) {

      let component = {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: receiver.buttons_params
      }
      components.push(component);
    }

    if (receiver.url_buttons_params) {

      let component = {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: receiver.url_buttons_params
      }
      components.push(component);
    }

    if (components.length > 0) {
      whatsapp_message.template.components = components;
    }


    return whatsapp_message;
  }

  async toTiledesk(whatsappChannelMessage, from, media_url) {

    winston.debug("(wab) [Translator] whatsapp message: ", whatsappChannelMessage);

    // text message
    if (whatsappChannelMessage.type == 'text') {
      var data = {
        text: whatsappChannelMessage.text.body,
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
      }
      return data;
    }

    else if (whatsappChannelMessage.type == 'button')  {
      var tiledeskMessage = {
        text: whatsappChannelMessage.button.text, // or whatsappChannelMessage.button.payload (?)
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
      }
      return tiledeskMessage;
    }

    // interactive message
    else if (whatsappChannelMessage.type == 'interactive') {
      
      // list reply
      if (whatsappChannelMessage.interactive.type == 'list_reply') {
        // action button
        if (whatsappChannelMessage.interactive.list_reply.id.startsWith("action")) {
          var tiledeskMessage = {
            senderFullname: from,
            //text: ' ',
            text: whatsappChannelMessage.interactive.list_reply.title,
            type: 'text',
            attributes: {
              action: whatsappChannelMessage.interactive.list_reply.id.substring(11),
              //subtype: 'info'
            },
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
        // quick reply button
        if (whatsappChannelMessage.interactive.list_reply.id.startsWith("quick")) {
          var tiledeskMessage = {
            text: whatsappChannelMessage.interactive.list_reply.title,
            senderFullname: from,
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
      }

      // inline button reply
      if (whatsappChannelMessage.interactive.type == 'button_reply') {
        // action button
        if (whatsappChannelMessage.interactive.button_reply.id.startsWith("action")) {
          var tiledeskMessage = {
            senderFullname: from,
            //text: ' ',
            text: whatsappChannelMessage.interactive.button_reply.title,
            type: 'text',
            attributes: {
              action: whatsappChannelMessage.interactive.button_reply.id.substring(11),
              //subtype: 'info'
            },
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
        // quick reply button
        if (whatsappChannelMessage.interactive.button_reply.id.startsWith("quick")) {
          var tiledeskMessage = {
            //text: whatsappChannelMessage.interactive.button_reply.id.substring(10),
            text: whatsappChannelMessage.interactive.button_reply.title,
            senderFullname: from,
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
      }
    }

    // media message - image
    else if (whatsappChannelMessage.type == 'image') {

      let text = "Image attached"
      if (whatsappChannelMessage.image.caption) {
        text = whatsappChannelMessage.image.caption;
      }

      var tiledeskMessage = {
        text: text,
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME },
        type: "image",
        metadata: {
          src: media_url
        }
      }
      return tiledeskMessage;
    }

    // media message - video
    else if (whatsappChannelMessage.type == 'video') {

      let text = "Video attached"
      if (whatsappChannelMessage.video.caption) {
        text = whatsappChannelMessage.video.caption;
      }

      var tiledeskMessage = {
        text: "[Download video](" + media_url + ")",
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME },
        type: "file",
        metadata: {
          name: "video.mp4",
          type: "video/mp4",
          src: media_url,
        }
      }
      return tiledeskMessage;
    }

    // media message - document
    else if (whatsappChannelMessage.type == 'document') {

      let text = "Document attached"
      if (whatsappChannelMessage.document.caption) {
        text = whatsappChannelMessage.document.caption
      }

      var tiledeskMessage = {
        text: "[Dowload document](" + media_url + ")",
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME },
        type: "file",
        metadata: {
          name: "document.pdf",
          type: "application/pdf",
          src: media_url
        }
      }
      return tiledeskMessage;
    }

    // media message - audio
    else if (whatsappChannelMessage.type == 'audio') {

      let text = "Audio attached"
      /*if (whatsappChannelMessage.document.caption) {
        text = whatsappChannelMessage.document.caption
      }*/

      var tiledeskMessage = {
        text: "",
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME },
        type: "file",
        metadata: {
          name: "audio.mp3",
          type: "audio/mpeg",
          src: media_url
        }
      }
      return tiledeskMessage;
    }

    else {
      winston.verbose("(wab) [Translator] unsupported whatsapp messsage type");
      return null;
    }
  }

  async fillParams(params, rcv_option) {
    winston.verbose("(wab) [Translator] fillParams...");

    if (!params) {
      return null;
    }

    let header_params = params.header;
    if (header_params) {
      header_params.forEach((param, i) => {
        if (param.type === "text") {
          param.text = rcv_option.header_params[i];
        }
        if (param.type === "IMAGE") {
          param.image = {
            link: rcv_option.header_params[i]
          }
        }
        if (param.type === 'DOCUMENT') {
          param.document = {
            link: rcv_option.header_params[i]
          }
        }
        if (param.type === 'LOCATION') {
          // Check how to send location template!
        }
      })
    }

    let body_params = params.body;
    if (body_params) {
      body_params.forEach((param, i) => {
        param.text = rcv_option.body_params[i];
      })
    }

    let buttons_params = params.buttons;
    if (buttons_params) {
      buttons_params.forEach((param, i) => {
        param.text = rcv_option.buttons_params[i];
      })
    }
    return params;
  }


  async sanitizeTiledeskMessage(tiledeskJsonMessage, rcv_option) {
    winston.verbose("(wab) [Translator] Sanitizing...");

    if (!tiledeskJsonMessage.attributes.attachment.template.params) {
      return tiledeskJsonMessage;
    }

    let header_params = tiledeskJsonMessage.attributes.attachment.template.params.header;
    if (header_params) {
      header_params.forEach((param, i) => {
        if (param.type === "text") {
          param.text = rcv_option.header_params[i];
        }
        if (param.type === "IMAGE") {
          param.image = {
            link: rcv_option.header_params[i]
          }
        }
        if (param.type === 'DOCUMENT') {
          param.document = {
            link: rcv_option.header_params[i]
          }
        }
        if (param.type === 'LOCATION') {
          // Check how to send location template!
        }
      })
    }

    let body_params = tiledeskJsonMessage.attributes.attachment.template.params.body;
    if (body_params) {
      body_params.forEach((param, i) => {
        param.text = rcv_option.body_params[i];
      })
    }

    let buttons_params = tiledeskJsonMessage.attributes.attachment.template.params.buttons;
    if (buttons_params) {
      buttons_params.forEach((param, i) => {
        param.text = rcv_option.buttons_params[i];
      })
    }

    return tiledeskJsonMessage;
  }
  /*
  *************************************
  ********* WHATSAPP BUSINESS *********
  **************** END ****************
  */

}

module.exports = { TiledeskWhatsappTranslator };