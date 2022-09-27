class TiledeskWhatsappTranslator {

  /**
   * Constructor for TiledeskWhatsappTranslator
   *
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
    console.log("this.tiledeskChannelMessage: ", this.tiledeskChannelMessage);
    */
    
    this.log = true;
    

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


    // to --> recipient
    if (this.log) {
      console.log("[Translator] tiledesk message: ", tiledeskChannelMessage)
    }
    let text = tiledeskChannelMessage.text.replace(/-{1,}/g, '');
    text = text.replace(/\*{2,}/g, '*')

    let whatsapp_message = {
      messaging_product: TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT,
      to: whatsapp_receiver,
    }

    if (tiledeskChannelMessage.metadata) {
  
      if (tiledeskChannelMessage.type.startsWith('image')) {
      //if (tiledeskChannelMessage.metadata.type.startsWith('image/')) {
        var imgUrl = tiledeskChannelMessage.metadata.src;
        whatsapp_message.type = 'image'
        whatsapp_message.image = {
          link: imgUrl,
          caption: text
        }
      }

      if (tiledeskChannelMessage.type.startsWith('video')) {
      //if (tiledeskChannelMessage.metadata.type.startsWith('video/')) {
        var videoUrl = tiledeskChannelMessage.metadata.src;
        whatsapp_message.type = 'document'
        whatsapp_message.document = {
          link: videoUrl,
          caption: text
        }
        /*
        data.type = 'video'
        data.video = {
          link: videoUrl,
          caption: text
        }
        */
      }

      if (tiledeskChannelMessage.type.startsWith('application')) {
      //if (tiledeskChannelMessage.metadata.type.startsWith('application/')) {
        var doc = tiledeskChannelMessage.metadata.src;
        whatsapp_message.type = 'document'
        whatsapp_message.document = {
          link: doc,
          caption: text
        }
      }

      if (this.log) {
        console.log("[Translator] whatsapp message: ", whatsapp_message)
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

            if (this.log) {
              console.log("[Translator] whatsapp message: ", whatsapp_message)
            }
            return whatsapp_message;
            
          }

          if (buttons_count > 0 && buttons_count < 4) {

            for (let btn of buttons) {
              let title = (btn.value.length > 20) ? btn.value.substr(0, 18) + '..' : btn.value;

              if (btn.type == 'text') {
                let text_btn = {
                  type: "reply",
                  reply: {
                    id: "quick_" + btn.value,
                    title: title
                  }
                }
                quick_replies.push(text_btn);
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

            if (this.log) {
              console.log("[Translator] whatsapp message: ", whatsapp_message)
            }
            return whatsapp_message;
          }

          if (buttons_count > 3 && buttons_count < 11) {

            for (let btn of buttons) {
              let title = (btn.value.length > 24) ? btn.value.substr(0, 22) + '..' : btn.value;

              if (btn.type == 'text') {
                let row = {
                  id: "quick_" + btn.value,
                  title: title
                }
                option_rows.push(row);
              }

              if (btn.type == 'action') {
                let row = {
                  id: "action_" + btn.action,
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

            if (option_rows.length == 0 && action_rows.length > 0) {
              sections = [
                {
                  title: "Actions",
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

            if (this.log) {
              console.log("[Translator] whatsapp message: ", whatsapp_message)
            }
            return whatsapp_message;
          }

          if (buttons_count > 10) {
            // too many buttons
            // Option 1: Skip message
            // Option 2: Cut buttons array -> display first 10 buttons only
            // Option 3: Send message with *buttons (questa)

            whatsapp_message.text = { body: tiledeskChannelMessage.attributes._raw_message };

            if (this.log) {
              console.log("[Translator] whatsapp message: ", whatsapp_message)
            }
            return whatsapp_message;

          }

        } else {

          whatsapp_message.text = { body: text };

          if (this.log) {
            console.log("[Translator] whatsapp message: ", whatsapp_message)
          }
          return whatsapp_message;
        }

      } else {

        whatsapp_message.text = { body: text };

        if (this.log) {
          console.log("[Translator] whatsapp message: ", whatsapp_message)
        }
        return whatsapp_message;
      }



    } else {
      // Skip message - non si deve fare qui!
      return null
    }
  }

  toTiledesk(whatsappChannelMessage, from, media_url) {

    if (this.log) {
      console.log("[Translator] whatsapp message: ", whatsappChannelMessage)
    }

    // text message
    if (whatsappChannelMessage.type == 'text') {
      var data = {
        text: whatsappChannelMessage.text.body,
        senderFullname: from,
        channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
      }
      return data;
    }

    // interactive message
    if (whatsappChannelMessage.type == 'interactive') {

      // list reply
      if (whatsappChannelMessage.interactive.type == 'list_reply') {
        // action button
        if (whatsappChannelMessage.interactive.list_reply.id.startsWith("action_")) {
          var tiledeskMessage = {
            senderFullname: from,
            text: ' ',
            type: 'text',
            attributes: {
              action: whatsappChannelMessage.interactive.list_reply.id.substring(7),
              subtype: 'info'
            },
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
        // quick reply button
        if (whatsappChannelMessage.interactive.list_reply.id.startsWith("quick_")) {
          var tiledeskMessage = {
            text: whatsappChannelMessage.interactive.list_reply.id.substring(6),
            senderFullname: from,
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
      }

      // inline button reply
      if (whatsappChannelMessage.interactive.type == 'button_reply') {
        // action button
        if (whatsappChannelMessage.interactive.button_reply.id.startsWith("action_")) {
          var tiledeskMessage = {
            senderFullname: from,
            text: ' ',
            type: 'text',
            attributes: {
              action: whatsappChannelMessage.interactive.button_reply.id.substring(7),
              subtype: 'info'
            },
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
        // quick reply button
        if (whatsappChannelMessage.interactive.button_reply.id.startsWith("quick_")) {
          var tiledeskMessage = {
            text: whatsappChannelMessage.interactive.button_reply.id.substring(6),
            senderFullname: from,
            channel: { name: TiledeskWhatsappTranslator.CHANNEL_NAME }
          }
          return tiledeskMessage;
        }
      }
    }

    // media message - image
    if (whatsappChannelMessage.type == 'image') {

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
    if (whatsappChannelMessage.type == 'video') {

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
    if (whatsappChannelMessage.type == 'document') {

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
  }
  /*
  *************************************
  ********* WHATSAPP BUSINESS *********
  **************** END ****************
  */

}

module.exports = { TiledeskWhatsappTranslator };