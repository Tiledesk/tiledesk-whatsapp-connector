var assert = require('assert');
const { TiledeskWhatsappTranslator } = require('../tiledesk/TiledeskWhatsappTranslator');
const log = false;


describe('Test Translator\n', function() {

  // TILEDESK >>>>>>>>> WHATSAPP

  it("Translates a TEXT message from Tiledesk to Whatsapp", function() {
    let tiledeskChannelMessage = {
      text: 'Test Message',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      attributes: {
        userFullname: 'John Doe'
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    assert(whatsappJsonMessage.to === whatsapp_receiver);
    assert(whatsappJsonMessage.text);
    assert(whatsappJsonMessage.text.body === tiledeskChannelMessage.text);
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })

  it("Translates a message containing an IMAGE from Tiledesk to Whatsapp", function() {

    let tiledeskChannelMessage = {
      text: 'Image Caption', // can be empty --> ""
      type: 'image',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      metadata: {
        src: 'https://fakeimageurl.com/',
        type: 'image/png'
      },
      attributes: {
        userFullname: 'John Doe'
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    assert(whatsappJsonMessage.to === whatsapp_receiver);
    assert(!whatsappJsonMessage.text);
    assert(whatsappJsonMessage.image);
    assert(whatsappJsonMessage.image.link === tiledeskChannelMessage.metadata.src);
    assert(whatsappJsonMessage.image.caption === tiledeskChannelMessage.text);
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })

  it("Translates a message containing a VIDEO message from Tiledesk to Whatsapp", function() {

    let tiledeskChannelMessage = {
      text: 'Video Caption', // can be empty --> ""
      type: 'video',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      metadata: {
        src: 'https://fakevideourl.com/',
        type: 'video/mp4',
        name: 'fakevideo.mp4'
      },
      attributes: {
        userFullname: 'John Doe'
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    assert(whatsappJsonMessage.to === whatsapp_receiver);
    assert(!whatsappJsonMessage.text);
    assert(whatsappJsonMessage.video);
    assert(whatsappJsonMessage.video.link === tiledeskChannelMessage.metadata.src);
    assert(whatsappJsonMessage.video.caption === tiledeskChannelMessage.metadata.name);
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })

  it("Translates a message containing a DOCUMENT from Tiledesk to Whatsapp", function() {

    let tiledeskChannelMessage = {
      text: '[fakedocument.pdf](https://fakedocumenturl.com/)\n' + 'Document Caption', // can be empty --> ""
      type: 'application',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      metadata: {
        downloadURL: 'https://fakedocumenturl.com/',
        src: 'https://fakedocumenturl.com/',
        name: "fakedocument.pdf",
        type: 'application/pdf'
      },
      attributes: {
        userFullname: 'John Doe'
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    assert(whatsappJsonMessage.to === whatsapp_receiver);
    assert(!whatsappJsonMessage.text);
    assert(whatsappJsonMessage.document);
    assert(whatsappJsonMessage.document.link === tiledeskChannelMessage.metadata.src);
    assert(whatsappJsonMessage.document.filename === tiledeskChannelMessage.metadata.name);
    let index = tiledeskChannelMessage.text.indexOf(tiledeskChannelMessage.metadata.src);
    if (index != -1) {
      let length = tiledeskChannelMessage.metadata.src.length;
      assert(whatsappJsonMessage.document.caption === tiledeskChannelMessage.text.substring(index + length + 2));
    }
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })

  it("Translates a message with BUTTONS (max. 3) from Tiledesk to Whatsapp", function() {

    let tiledeskChannelMessage = {
      text: 'Test Message',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      attributes: {
        attachment: {
          buttons: [
            { type: 'text', value: 'Button 1' },
            { type: 'text', value: 'Button 2' },
            { type: 'action', value: '↩︎ Back', action: 'main_menu' }
          ]
        }
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    assert(!whatsappJsonMessage.text);
    assert(whatsappJsonMessage.type === "interactive");
    assert(whatsappJsonMessage.interactive);
    assert(whatsappJsonMessage.interactive.type === "button");
    assert(whatsappJsonMessage.interactive.body.text === tiledeskChannelMessage.text);
    assert(whatsappJsonMessage.interactive.action);
    assert(whatsappJsonMessage.interactive.action.buttons.length === 3);
    tiledeskChannelMessage.attributes.attachment.buttons.forEach((button, index) => {
      assert(button.value === whatsappJsonMessage.interactive.action.buttons[index].reply.title)
    })
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })

  it("Translates a message with BUTTONS (min. 4 - max 10) from Tiledesk to Whatsapp", function() {

    let tiledeskChannelMessage = {
      text: 'Test Message',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      attributes: {
        attachment: {
          buttons: [
            { type: 'text', value: 'Button 1' },
            { type: 'text', value: 'Button 2' },
            { type: 'text', value: 'Button 3' },
            { type: 'text', value: 'Button 4' },
            { type: 'action', value: '↩︎ Back', action: 'main_menu' }
          ]
        }
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    assert(!whatsappJsonMessage.text);
    assert(whatsappJsonMessage.type === "interactive");
    assert(whatsappJsonMessage.interactive);
    assert(whatsappJsonMessage.interactive.type === "list");
    assert(whatsappJsonMessage.interactive.body.text === tiledeskChannelMessage.text);
    assert(whatsappJsonMessage.interactive.action);
    assert(whatsappJsonMessage.interactive.action.button === 'Choose an option');
    assert(whatsappJsonMessage.interactive.action.sections);
    assert(whatsappJsonMessage.interactive.action.sections[0].rows.length === 5);
    //assert(whatsappJsonMessage.interactive.action.sections[1].rows.length === 1);
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })

  it("Translates a message with BUTTONS (more than 10) from Tiledesk to Whatsapp", function() {

    let tiledeskChannelMessage = {
      text: 'Test Message',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-wab-104777398965560-393484506627',
      attributes: {
        attachment: {
          buttons: [
            { type: 'text', value: 'Button 1' },
            { type: 'text', value: 'Button 2' },
            { type: 'text', value: 'Button 3' },
            { type: 'text', value: 'Button 4' },
            { type: 'text', value: 'Button 5' },
            { type: 'text', value: 'Button 6' },
            { type: 'text', value: 'Button 7' },
            { type: 'text', value: 'Button 8' },
            { type: 'text', value: 'Button 9' },
            { type: 'text', value: 'Button 10' },
            { type: 'text', value: 'Button 11' },
            { type: 'text', value: 'Button 12' },
            { type: 'action', value: '↩︎ Back', action: 'main_menu' }
          ]
        }
      }
    }
    let whatsapp_receiver = tiledeskChannelMessage.recipient.substring(tiledeskChannelMessage.recipient.lastIndexOf("-") + 1)

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage, whatsapp_receiver);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT);
    /*
    assert(!whatsappJsonMessage.text);
    assert(whatsappJsonMessage.type === "interactive");
    assert(whatsappJsonMessage.interactive);
    assert(whatsappJsonMessage.interactive.type === "list");
    assert(whatsappJsonMessage.interactive.body.text === tiledeskChannelMessage.text);
    assert(whatsappJsonMessage.interactive.action);
    assert(whatsappJsonMessage.interactive.action.button === 'Choose an option');
    assert(whatsappJsonMessage.interactive.action.sections);
    assert(whatsappJsonMessage.interactive.action.sections[0].rows.length === 4);
    assert(whatsappJsonMessage.interactive.action.sections[1].rows.length === 1);
    */
    if (log) {
      console.log("(test) whatsappJsonMessage: ", whatsappJsonMessage);
    }
  })


  // WHATSAPP >>>>>>>>> TILEDESK

  it("Translates a TEXT message from Whatsapp to Tiledesk", async () => {

    let whatsappChannelMessage = {
      text: {
        body: "Test Message"
      },
      type: "text"
    }
    let fullname = "John Doe"; // from whatsapp contacts

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, null)
    assert(tiledeskJsonMessage != null);
    assert(tiledeskJsonMessage.channel.name === TiledeskWhatsappTranslator.CHANNEL_NAME);
    assert(tiledeskJsonMessage.text === whatsappChannelMessage.text.body);
    assert(tiledeskJsonMessage.senderFullname === fullname);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })

  it("Translates a message with QUICK REPLY (list_reply) from Whatsapp to Tiledesk", async () => {

    let whatsappChannelMessage = {
      type: "interactive",
      interactive: {
        type: "list_reply",
        list_reply: {
          id: "quick1234_Tiledesk Overview",
          title: "Tiledesk Overview"
        }
      }
    }
    let fullname = "John Doe"; // from whatsapp contacts

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, null)
    assert(tiledeskJsonMessage != null);
    assert(tiledeskJsonMessage.channel.name === TiledeskWhatsappTranslator.CHANNEL_NAME);
    assert(tiledeskJsonMessage.text === whatsappChannelMessage.interactive.list_reply.title);
    assert(tiledeskJsonMessage.senderFullname === fullname);
    if (log) {
      console.log("(test) --> tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })

  it("Translates a message with ACTION BUTTON (list_reply) from Whatsapp to Tiledesk", async () => {

    let whatsappChannelMessage = {
      type: "interactive",
      interactive: {
        type: "list_reply",
        list_reply: {
          id: "action1234_main_menu",
          title: "↩︎ Back"
        }
      }
    }
    let fullname = "John Doe"; // from whatsapp contacts

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, null)
    assert(tiledeskJsonMessage != null);
    console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    assert(tiledeskJsonMessage.channel.name === TiledeskWhatsappTranslator.CHANNEL_NAME);
    assert(tiledeskJsonMessage.text === ' ');
    assert(tiledeskJsonMessage.type === 'text');
    assert(tiledeskJsonMessage.attributes);
    assert(tiledeskJsonMessage.attributes.action);
    assert(tiledeskJsonMessage.attributes.action === whatsappChannelMessage.interactive.list_reply.id.substring(11));
    assert(tiledeskJsonMessage.attributes.subtype);
    assert(tiledeskJsonMessage.attributes.subtype === "info");
    assert(tiledeskJsonMessage.senderFullname === fullname);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }

  })

  it("Translates a message with QUICK REPLY (button_reply) from Whatsapp to Tiledesk", async () => {

    let whatsappChannelMessage = {
      type: "interactive",
      interactive: {
        type: "button_reply",
        button_reply: {
          id: "quick1234_Cloud pricing",
          title: "Cloud pricing"
        }
      }
    }
    let fullname = "John Doe"; // from whatsapp contacts

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, null)
    assert(tiledeskJsonMessage != null);
    assert(tiledeskJsonMessage.channel.name === TiledeskWhatsappTranslator.CHANNEL_NAME);
    assert(tiledeskJsonMessage.text === whatsappChannelMessage.interactive.button_reply.title);
    assert(tiledeskJsonMessage.senderFullname === fullname);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })

  it("Translates a message with ACTION BUTTON (button_reply) from Whatsapp to Tiledesk", async () => {

    let whatsappChannelMessage = {
      type: "interactive",
      interactive: {
        type: "button_reply",
        button_reply: {
          id: "action_main_menu",
          title: "↩︎ Back"
        }
      }
    }
    let fullname = "John Doe"; // from whatsapp contacts

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, null)
    assert(tiledeskJsonMessage != null);
    assert(tiledeskJsonMessage.channel.name === TiledeskWhatsappTranslator.CHANNEL_NAME);
    assert(tiledeskJsonMessage.text === ' ');
    assert(tiledeskJsonMessage.type === 'text');
    assert(tiledeskJsonMessage.attributes);
    assert(tiledeskJsonMessage.attributes.action);
    assert(tiledeskJsonMessage.attributes.action === whatsappChannelMessage.interactive.button_reply.id.substring(11));
    assert(tiledeskJsonMessage.attributes.subtype);
    assert(tiledeskJsonMessage.attributes.subtype === 'info');
    assert(tiledeskJsonMessage.senderFullname === fullname);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })

  it("Translates a message containing an IMAGE from Whatsapp to Tiledesk", async () => {
    let whatsappChannelMessage = {
      type: "image",
      image: {
        caption: "Image Caption" // optional
      }
    }
    let fullname = "John Doe";
    let media_url = "https://fakeimageurl.com/"

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, media_url);
    assert(tiledeskJsonMessage != null);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })

  it("Translates a message containing a VIDEO from Whatsapp to Tiledesk", async () => {
    let whatsappChannelMessage = {
      type: "video",
      video: {
        caption: "Video Caption" // optional
      }
    }
    let fullname = "John Doe";
    let media_url = "https://fakevideourl.com/"

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, media_url);
    assert(tiledeskJsonMessage != null);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })

  it("Translates a message containing a DOCUMENT from Whatsapp to Tiledesk", async () => {
    let whatsappChannelMessage = {
      type: "document",
      document: {
        caption: "Document Caption" // optional
      }
    }
    let fullname = "John Doe";
    let media_url = "https://fakedocumenturl.com/"

    const tlr = new TiledeskWhatsappTranslator();
    assert(tlr != null);
    const tiledeskJsonMessage = await tlr.toTiledesk(whatsappChannelMessage, fullname, media_url);
    assert(tiledeskJsonMessage != null);
    if (log) {
      console.log("(test) tiledeskJsonMessage: ", tiledeskJsonMessage);
    }
  })


})