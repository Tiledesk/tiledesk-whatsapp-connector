const axios = require("axios").default;
const fs = require('fs');
const FormData = require('form-data');

class WhatsappUtils {

  /**
   * Constructor for WhatsappUtils
   *
   * @example
   * const { WhatsappUtils } = require('whatsapp-utils');
   * const media = new TiledeskClient({channelMedia: media, token: whatsappBusinessToken});
   * 
   * @param {Object} config JSON configuration.
   * @param {string} config.token Mandatory. Token required for authentication
   * @param {boolean} options.log Optional. If true HTTP requests are logged.
   */

  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.token) {
      throw new Error('config.token is mandatory');
    }
    // this.media = config.channelMedia;
    this.token = config.token;
  }

  async downloadMedia(mediaId) {

    const GRAPH_URL = process.env.GRAPH_URL;
    console.log("downloadMedia: ", mediaId);

    return await axios({
      url: GRAPH_URL + mediaId,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + this.token
      }
    }).then(async (response) => {
      console.log("response: ", response.data);

      let download_url = response.data.url;
      let mime_type = response.data.mime_type;
      let extension = mime_type.substring(mime_type.lastIndexOf("/") + 1);
      let tid = this.getId();
      let type = "media-" + tid + "." + extension;

      const writeStream = fs.createWriteStream('tmp/' + type);
      console.log("[Downloading file...]");

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
            console.log("[Download failed]")
            reject(err);
          });
          writeStream.on('close', () => {
            if (!error) {
              console.log("[Download completed]")
              resolve('tmp/' + type);
            }
          })
        })
      }).catch((err) => {
        console.log("axios err: ", err);  
      })
    }).catch((err) => {
      console.log("axios err: ", err);
    })
  }

  async uploadMedia(path, type) {
    let url = "https://tiledesk-server-pre.herokuapp.com/" + type + "/public";
    console.log("[Uploading file...]");

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
      console.log("axios response: ", response.data)

      if (type == "images") {
        let image_url = "https://tiledesk-server-pre.herokuapp.com/images/?path=" + response.data.filename;
        return image_url;
      } else {
        let file_url = "https://tiledesk-server-pre.herokuapp.com/files/download?path=" + response.data.filename;
        return file_url;
      }

    })
  }


  getId() {
    var newTime = Math.floor((new Date()).getTime() / 1000) - 1546300800;//seconds since 01/01/2019
    return newTime.toString(36);
  }

}

module.exports = { WhatsappUtils };