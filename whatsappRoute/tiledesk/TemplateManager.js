const axios = require("axios").default;
const winston = require('../winston');

class TemplateManager {

  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.token) {
      throw new Error('config.token is mandatory');
    }

    if (!config.business_account_id) {
      throw new Error('config.business_account_id is mandatory');
    }
    
    if (!config.GRAPH_URL) {
      throw new Error('config.GRAPH_URL is mandatory');
    }


    this.token = config.token;
    this.graph_url = config.GRAPH_URL;
    this.business_account_id = config.business_account_id;
    
  }

  async getTemplates() {
    // business account id: 110354305066769
    // business phone number id: 104777398965560
    return await axios({
      url: this.graph_url + this.business_account_id + "/message_templates?access_token=" + this.token,
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'GET'
    }).then((response) => {
      return response.data;
    }).catch((err) => {
      winston.error("get template error: ", err.response.data);
      return null;
    })
  }

  async getTemplateNamespace() {

    return await axios({
      url: this.graph_url + this.business_account_id + "?fields=message_template_namespace&access_token=" + this.token,
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'GET'
    }).then((response) => {
      return response.data;
    }).catch((err) => {
      winston.error("get template namespace error: ", err);
    })
  }
  
}

module.exports = { TemplateManager };