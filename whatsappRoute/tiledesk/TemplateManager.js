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

  async generateParamsObject2(template) {
    let params;
    let body_component = template.components.find(c => c.type === 'BODY');

    this.generateBody(body_component).then((body_params) => {
      params = {
        body: body_params
      }
      return params;
    })
    
    
  }

  async generateBody(body_component) {
    let body_params = [];
    return new Promise((resolve, reject) => {
      if (body_component) {
        if (body_component.example) {
          body_component.example.body_text[0].forEach((p, i) => {
            body_params.push({ type: "text", text: null })
          })
        }
      }
      resolve(body_params)
    })
  }

  async generateParamsObject(template) {

    let header_params = [];
    let body_params = [];
    let url_button_params = [];
    let header_component = template.components.find(c => c.type === 'HEADER');
    let body_component = template.components.find(c => c.type === 'BODY');
    let buttons_component = template.components.find(c => c.type === 'BUTTONS');
    let url_button_component;
    
    if (buttons_component) {
      url_button_component = buttons_component.buttons.find(c => c.type === 'URL')
    }

    if (header_component) {
      if (header_component.example) {
        if (header_component.example.header_text) {
            header_component.example.header_text.forEach((p, i) => {
            header_params.push({ type: "text", text: null })
          })
        }

        if (header_component.example.header_handle) {
          if (header_component.format === 'IMAGE') {
            header_component.example.header_handle.forEach((p, i) => {
              header_params.push({ type: header_component.format, image: { link: null } })
            })
          }
          if (header_component.format === 'DOCUMENT') {
            header_component.example.header_handle.forEach((p, i) => {
              header_params.push({ type: header_component.format, document: { link: null } })
            })
          }
        }

      } else {

        if (header_component.format === "TEXT") {
          header_params.push({ type: "text", text: header_component.text })
        }

        else if (header_component.format === 'LOCATION') {
          header_params.push({ type: header_component.format, location: { latitude: null, longitude: null, name: null, address: null } })
        }
        else {
          winston.verbose("(Template Manager) Unrecognized Header: ", header_component)
        }

      }
    }

    if (body_component) {
      if (body_component.example) {
        body_component.example.body_text[0].forEach((p, i) => {
          body_params.push({ type: "text", text: null })
        })
      }
    }

    if (url_button_component) {
      if (url_button_component.example) {
        url_button_component.example.forEach((p, i) => {
          url_button_params.push({ type: "text", text: null })
        })
      }
    }


    /*
    let params = {
      header: header_params,
      body: body_params,
      buttons: url_button_params
    }
    */

    let params = {}

    if (header_params.length > 0) {
      params.header = header_params;
    }

    if (body_params.length > 0) {
      params.body = body_params;
    }

    if (url_button_params.length > 0) {
      params.buttons = url_button_params;
    }
    return params;
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