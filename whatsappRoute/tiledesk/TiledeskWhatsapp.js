const axios = require("axios").default;
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');
const winston = require('../winston')

class TiledeskWhatsapp {

  /**
   * Constructor for TiledeskWhatsapp
   *
   * @example
   * const { TiledeskWhatsapp } = require('tiledesk-whatsapp');
   * const twclient = new TiledeskWhatsappClient({ token: whatsappBusinessToken });
   * 
   * @param {Object} config JSON configuration.
   * @param {string} config.token Mandatory. Token required for authentication.
   * @param {string} config.GRAPH_URL Mandatory. Url for facebook whatsapp api.
   * @param {boolean} options.log Optional. If true HTTP requests are logged.
   */

  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.token) {
      throw new Error('config.token is mandatory');
    }

    if (!config.GRAPH_URL) {
      throw new Error('config.GRAPH_URL is mandatory');
    }
    // this.media = config.channelMedia;
    this.token = config.token;
    this.GRAPH_URL = config.GRAPH_URL

    this.log = false;
    if (config.log) {
      this.log = config.log;
    }
  }

  async sendMessage(phone_number_id, message) {
    
    winston.debug("(wab) [TiledeskWhatsapp] Sending message...");

    return await axios({
      url: this.GRAPH_URL + phone_number_id + "/messages?access_token=" + this.token,
      headers: {
        "Content-Type": "application/json",
      },
      data: message,
      method: "POST"
    }).then((response) => {
      winston.debug("(wab) [TiledeskWhatsapp] Message sent!");
      return response
    }).catch((err) => {
      winston.error("(wab) [TiledeskWhatsapp] Send message error: " + err.response.data);
      throw err;
    })
  }

  async downloadMedia(mediaId) {
    
    return await axios({
      url: this.GRAPH_URL + mediaId,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + this.token
      }
    }).then(async (response) => {

      let download_url = response.data.url;
      let mime_type = response.data.mime_type;
      let extension = mime_type.substring(mime_type.lastIndexOf("/") + 1);
      let tid = this.getId();
      let type = "media-" + tid + "." + extension;

      let example_path = path.join(__dirname, '..', 'tmp', type);
      const writeStream = fs.createWriteStream(example_path);
      winston.debug("(wab) [TiledeskWhatsapp] Downloading file..." + example_path);

      return await axios({
        url: download_url,
        method: 'GET',
        headers: {
          'Authorization': "Bearer " + this.token
        },
        responseType: 'stream'
      }).then((response) => {

        return new Promise((resolve, reject) => {
          response.data.pipe(writeStream);
          let error = null;
          writeStream.on('error', err => {
            error = err;
            writeStream.close();
            winston.debug("(wab) [TiledeskWhatsapp] Download failed")
            reject(err);
          });
          writeStream.on('close', () => {
            if (!error) {
              winston.debug("(wab) [TiledeskWhatsapp] Download completed")
              resolve(type);
            }
          })
        })
      }).catch((err) => {
        winston.error("(wab) [TiledeskWhatsapp] download file error: " + err.data);
      })
    }).catch((err) => {
      winston.error("(wab) [TiledeskWhatsapp] get file error: " + err.data);
    })
  }

  async uploadMedia(path, type) {
    let url = "https://tiledesk-server-pre.herokuapp.com/" + type + "/public";
    winston.debug("(wab) [TiledeskWhatsapp] Uploading file...");

    const form = new FormData();
    form.append('file', fs.createReadStream(path));
    const request_config = {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      header: {
        ...form.getHeaders()
      }
    }

    return await axios.post(url, form, request_config).then((response) => {
        
      winston.debug("(wab) [TiledeskWhatsapp] upload response: " + response.data);
      if (type == "images") {
        let image_url = "https://tiledesk-server-pre.herokuapp.com/images/?path=" + response.data.filename;
        return image_url;
      } else {
        let file_url = "https://tiledesk-server-pre.herokuapp.com/files/download?path=" + response.data.filename;
        return file_url;
      }

    })
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
      winston.error("(wab) [TiledeskWhatsapp] An error occured: " + err);
      if (callback) {
        callback(err, null, null);
      }
    })
  }


  // FUNCTIONS

  getId() {
    var newTime = Math.floor((new Date()).getTime() / 1000) - 1546300800;//seconds since 01/01/2019
    return newTime.toString(36);
  }

}

module.exports = { TiledeskWhatsapp };