const axios = require("axios").default;

class TiledeskSubscriptionClient {
  
  /**
   * Constructor for TiledeskSubscriptionClient
   *
   * @example
   * const { TiledeskSubscriptionClient } = require('tiledesk-subscription-client');
   * const tdClient = new TiledeskSubscriptionClient({API_URL: tiledeskApiUrl, token: jwt_token});
   * 
   * @param {Object} config JSON configuration.
   * @param {string} config.API_URL Mandatory. The Tiledesk api url.
   * @param {string} config.token Optional. Token required for authentication.
   * @param {boolean} options.log Optional. If true HTTP requests are logged.
   */
  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.API_URL) {
      throw new Error('config.API_URL is mandatory');
    }

    // add project_id
    this.API_URL = config.API_URL;
    this.token = config.token;
    this.config = config;
  }

  async subscribe(projectId, data, callback) {

    const URL = this.API_URL + `/${projectId}/subscriptions`;
    const HTTPREQUEST = {
      url: URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token
      },
      json: data,
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
            resolve(resbody);
          }
        }, true);
      
    })
    return promise;
  }

  unsubscribe(projectId, subscriptionId, callback) {
    const URL = this.API_URL + `/${projectId}/subscriptions/${subscriptionId}`;
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
            resolve(resbody);
          }
        }, true);
    })
    return promise;
  }


  // HTTP REQUEST

  static async myrequest(options, callback, log) {
    if (log) {
      console.log("API URL: ", options.url);
      console.log("** Options: ", options);
    }
    return await axios({
      url: options.url,
      method: options.method,
      data: options.json,
      params: options.params,
      headers: options.headers
    }).then((res) => {
      if (log) {
        console.log("Response for url:", options.url);
        console.log("Response headers:\n", res.headers);
      }
      if (res && res.status == 200 && res.data) {
        if (callback) {
          callback(null, res.data);
        }
      }
      else {
        if (callback) {
          callback(TiledeskClient.getErr({message: "Response status not 200"}, options, res), null, null);
        }
      }
    }).catch((err) => {
      console.error("An error occured: ", err);
      if (callback) {
        callback(err, null, null);
      }
    })
  }
  
}

module.exports = { TiledeskSubscriptionClient }