const axios = require("axios").default;
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const winston = require('../winston');

class TiledeskAppsClient {
  /**
    * Constructor for TiledeskChannel
    *
    * @example
    * const { TiledeskAppsClient } = require('tiledesk-apps-client');
    * const appClient = new TiledeskAppsClient({ APPS_API_URL:  APPS_API_URL});
    * 
    * @param {Object} config JSON configuration.
    * @param {string} config.APPS_API_URL Mandatory. The api url for tiledesk apps.
    * @param {boolean} options.log Optional. If true HTTP requests are logged.
    */

  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.APPS_API_URL) {
      throw new Error('config.APPS_URL is mandatory');
    }

    this.APPS_API_URL = config.APPS_API_URL;
    
    this.log = false;
    if (config.log) {
      this.log = config.log;
    }
  }


  install(installation_info, callback) {
    
    const URL = this.APPS_API_URL + `/api/installation`;
    const HTTPREQUEST = {
      url: URL,
      headers: {
        'Content-Type': 'application/json',
      },
      json: installation_info,
      method: 'POST'
    };
    let promise = new Promise((resolve, reject) => {
      TiledeskAppsClient.myrequest(
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
            winston.verbose("[Tiledesk Apps Client] Installed!");
            resolve(resbody);
          }
        }, true);
    })
    return promise;
  }

  getInstallations(project_id, app_id) {
    const URL = this.APPS_API_URL + `/api/installation/${project_id}`;
    const HTTPREQUEST = {
      url: URL,
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'GET'
    };
    let promise = new Promise((resolve, reject) => {
      TiledeskAppsClient.myrequest(
        HTTPREQUEST,
        function(err, resbody) {
          if (err) {
            reject(err);
          }
          else {
            let obj = resbody.find(o => o.app_id === app_id);
            if (obj) {
              resolve(obj);
            } else {
              resolve(null);
            }
          }
        }, true);
    })
    return promise;
  }
  
  uninstall(project_id, app_id, callback) {
    const URL = this.APPS_API_URL + `/api/installation/${project_id}/${app_id}`;
    const HTTPREQUEST = {
      url: URL,
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'DELETE'
    };
    let promise = new Promise((resolve, reject) => {
      TiledeskAppsClient.myrequest(
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
            winston.verbose("[Tiledesk Apps Client] Uninstalled!");
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
          callback(TiledeskClient.getErr({ message: "Response status not 200" }, options, res), null, null);
        }
      }
    }).catch((err) => {
      winston.error("(wab) An error occured: ", err);
      if (callback) {
        callback(err, null, null);
      }
    })
  }
  
}

module.exports = { TiledeskAppsClient }