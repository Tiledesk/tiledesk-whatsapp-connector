var assert = require('assert');
const { TiledeskWhatsappTranslator } = require('../tiledesk/TiledeskWhatsappTranslator');


describe('test translator', function() {

  it('Translates a single text message from Tiledesk to Whatsapp', function() {
    /*
               let tiledeskChannelMessage = {
                // text
                // sender
                 ...
               }
               */



    let tiledeskChannelMessage = {
      senderFullname: 'Giovanni Troisi',
      type: 'text',
      channel_type: 'group',
      status: 200,
      _id: '630df22b9addd7003557cbb1',
      sender: '5faba2254e3e0e003470a8b9',
      recipient: 'support-group-62c3f10152dc7400352bab0d-86a2293e-c7dc-4e62-89b1-ffe9bba7fd59-wab-104777398965560-393484506627',
      text: 'ola',
      id_project: '62c3f10152dc7400352bab0d',
      createdBy: '5faba2254e3e0e003470a8b9',
      metadata: '',
      attributes: {

        userFullname: 'Giovanni Troisi'
      },
      channel: { name: 'chat21' },
      createdAt: '2022-08-30T11:19:07.655Z',
      updatedAt: '2022-08-30T11:19:07.655Z',
      __v: 0
    }

    const tlr = new TiledeskWhatsappTranslator({ channelMessage: tiledeskChannelMessage });
    assert(tlr != null);

    const whatsappJsonMessage = tlr.toWhatsapp(tiledeskChannelMessage.sender);
    assert(whatsappJsonMessage != null);
    assert(whatsappJsonMessage.messaging_product === TiledeskWhatsappTranslator.WHATSAPP_MESSAGING_PRODUCT)
    assert(whatsappJsonMessage.text)
    assert(whatsappJsonMessage.text.body === tiledeskChannelMessage.text);
    assert(whatsappJsonMessage.to === tiledeskChannelMessage.sender);
    console.log("whatsappJsonMessage: ", whatsappJsonMessage);

    let tiledeskChannelMessageImage = {

    }



  });

});