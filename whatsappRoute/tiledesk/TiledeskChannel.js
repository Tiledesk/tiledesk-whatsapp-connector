const axios = require("axios").default;
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class TiledeskChannel {

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

    if (!config.settings) {
      throw new Error('config.settings is mandatory');
    }

    if (!config.API_URL) {
      throw new Error('config.API_URL is mandatory');
    }

    this.log = false;
    if (config.log) {
      this.log = config.log;
    }

    this.settings = config.settings;
    this.API_URL = config.API_URL;

  }

  async send(tiledeskMessage, messageInfo) {

    let channel;
    let new_request_id;

    if (messageInfo.channel == "whatsapp") {
      channel = messageInfo.whatsapp;
      new_request_id = "support-group-" + this.settings.project_id + "-" + uuidv4().substring(0, 8) + "-wab-" + channel.phone_number_id + "-" + channel.from;

    } else if (messageInfo.channel == "telegram") {
      channel = messageInfo.telegram;
      // Check it
      //new_request_id = "support-group-" + projectId + "-" + uuidv4() + "-telegram-" + from;

    } else if (messageInfo.channel == "messenger") {
      channel = messageInfo.messenger;
      // Check it
      //new_request_id = hased_request_id = "support-group-" + projectId + "-" + uuidv4() + "-" + sender_id + "-" + webhook_event.recipient.id;

    } else {
      console.log("[Tiledesk Channel] Channel not supported")
    }

    var payload = {
      _id: 'wab-' + channel.from,
      first_name: channel.firstname,
      last_name: channel.lastname,
      email: 'na@whatsapp.com',
      sub: 'userexternal',
      aud: 'https://tiledesk.com/subscriptions/' + this.settings.subscriptionId
    }

    var customToken = jwt.sign(payload, this.settings.secret);

    return await axios({
      url: this.API_URL + "/auth/signinWithCustomToken",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': "JWT " + customToken
      },
      data: {},
      method: 'POST'
    }).then((response) => {

      let token = response.data.token;

      return axios({
        url: this.API_URL + `/${this.settings.project_id}/requests/me?channel=${messageInfo.channel}`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        method: 'GET'
      }).then((response) => {

        if (this.log) {
          console.log("[Tiledesk Channel] get request response: ", response.data);
        }

        let request_id;
        if (response.data.requests[0]) {
          request_id = response.data.requests[0].request_id;
        } else {
          request_id = new_request_id;
        }

        if (this.log) {
          console.log("[Tiledesk Channel] tiledeskMessage:", tiledeskMessage);
        }

        return axios({
          url: this.API_URL + `/${this.settings.project_id}/requests/${request_id}/messages`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          data: tiledeskMessage,
          method: 'POST'
        }).then((response) => {

          if (this.log) {
            console.log("[Tiledesk Channel] send message response: ", response.data);  
          }
          
          return response.data;

        }).catch((err) => {
          console.error("[Tiledesk Channel ERROR] send message: " + err);
        })
      }).catch((err) => {
        console.error("[Tiledesk Channel ERROR]  get requests: " + err);
      })


    }).catch((err) => {
      console.error("[Tiledesk Channel ERROR] sign in error: " + err);
    })
  }

}

module.exports = { TiledeskChannel }

