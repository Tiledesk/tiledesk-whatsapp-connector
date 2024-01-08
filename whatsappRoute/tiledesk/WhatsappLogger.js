const winston = require("../winston");
const { MessageLog } = require("../models/WhatsappLog");

class WhatsappLogger {

  constructor(config) {
    
    this.tdClient = config.tdClient;
    
  }

  async updateMessageStatus(message_id, status, error) {
    let status_code = this.getCodeFromStatus(status);
    winston.debug("(wab) getCodeFromStatus result " + status_code);

    MessageLog.findOneAndUpdate({ message_id: message_id }, { $set: {status: status, status_code: status_code, error: error }}, { new: true }).then((messageLog) => {

      if (messageLog) {
        winston.verbose("(wab) status of message_id " + message_id + " updated to " + status);
        winston.debug("(wab) messageLog updated ", messageLog);
        this.sendLogWebhook(messageLog);
      }

    }).catch((err) => {
      winston.error("(wab) findOneAndUpdate error: ", err);
    })

  }

  sendLogWebhook(messageLog) {
    let event = {
      name: "tiledesk.whatsapplog",
      attributes: {
        messageLog: messageLog,
      },
    };
    this.tdClient.fireEvent(event, (err, result) => {
      if (err) {
        winston.error("(wab) An error occurred invoking an event: ", err);
      }
      winston.verbose("(wab) Real time log event fired");
      winston.debug("(wab) Real time log event fired: ", result);
    });
  }
  
  async forwardMessage(whatsappBody) {
    let event = {
      name: "tiledesk.whatsappfw",
      attributes: {
        whatsappBody: whatsappBody
      }
    };
    this.tdClient.fireEvent(event, (err, result) => {
      if (err) {
        winston.error("(wab) An error occured invoking an event: ", err);
      }
      winston.verbose("(wab) Message forwarding event fired");
      winston.debug("(wab) Message forwarding event fired: ", result);
    })
  }
  
  
  
  getCodeFromStatus(status) {
    let code = null;
    switch (status) {
      case "rejected":
        code = -1;
        break;
      case "accepted":
        code = 0;
        break;
      case "sent":
        code = 1;
        break;
      case "delivered":
        code = 2;
        break;
      case "read":
        code = 3;
        break;
      default:
        code = -2;
        break;
    }
    return code;
  }


}

module.exports = { WhatsappLogger };
