const axios = require("axios").default;
const winston = require('../winston')

class TiledeskSubscriptionClient {

  /**
   * Constructor for TiledeskSubscriptionClient
   *
   * @example
   * const { TiledeskSubscriptionClient } = require('tiledesk-subscription-client');
   * const tdClient = new TiledeskSubscriptionClient({API_URL: tiledeskApiUrl, token: jwt_token, log: log});
   * @param {Object} config JSON configuration.
   * @param {string} config.API_URL Mandatory. The Tiledesk api url.
   * @param {string} config.token Optional. Token required for authentication.
   * @param {boolean} config.log Optional. If true HTTP requests are logged.
   */
  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.API_URL) {
      throw new Error('config.API_URL is mandatory');
    }

    this.project_id = config.project_id
    this.API_URL = config.API_URL;
    this.token = config.token;
    this.config = config;
    this.log = false;
    if (config.log) {
      this.log = config.log;
    }
  }

  async subscribe(subscription_info, callback) {

    const URL = this.API_URL + `/${this.project_id}/subscriptions`;
    const HTTPREQUEST = {
      url: URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token
      },
      json: subscription_info,
      method: 'POST'
    };
    let promise = new Promise((resolve, reject) => {
      TiledeskSubscriptionClient.myrequest(
        HTTPREQUEST,
        function(err, resbody) {
          if (err) {
            if (callback) {
              callback(err);
            }
            reject(err);
          }
          else {
            if (callback) {
              callback(null, resbody);
            }
            winston.verbose("(wab) [TiledeskSubscriptionClient] Subscribed");
            resolve(resbody);
          }
        }, true);

    })
    return promise;
  }

  unsubscribe(subscriptionId, callback) {
    const URL = this.API_URL + `/${this.project_id}/subscriptions/${subscriptionId}`;
    const HTTPREQUEST = {
      url: URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token
      },
      method: 'DELETE'
    };
    let promise = new Promise((resolve, reject) => {
      TiledeskSubscriptionClient.myrequest(
        HTTPREQUEST,
        function(err, resbody) {
          if (err) {
            if (callback) {
              callback(err);
            }
            reject(err);
          }
          else {
            if (callback) {
              callback(null, resbody);
            }
            winston.verbose("(wab) [TiledeskSubscriptionClient] Unsubscribed");
            resolve(resbody);
          }
        }, true);
    })
    return promise;
  }


  // HTTP REQUEST

  static async myrequest(options, callback, log) {
    
    return await axios({
      url: options.url,
      method: options.method,
      data: options.json,
      params: options.params,
      headers: options.headers
    }).then((res) => {
      if (res && res.status == 200 && res.data) {
        if (callback) {
          callback(null, res.data);
        }
      }
      else {
        if (callback) {
          callback("Response status not 200", null, null);
          //callback({ message: "Response status not 200" }, options, res), null, null);
        }
      }
    }).catch((err) => {
      if (callback) {
        callback(err, null, null);
      }
    })
  }

}

module.exports = { TiledeskSubscriptionClient }