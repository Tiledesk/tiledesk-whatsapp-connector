const winston = require("../winston");
const { MessageLog } = require("../models/WhatsappLog");

class WhatsappLogger {

  constructor(config) {

    console.log(config);
    
    this.tdClient = config.tdClient;
  }

  async updateMessageStatus(message_id, status, error) {
    let status_code = this.getCodeFromStatus(status);
    winston.debug("(wab) getCodeFromStatus result " + status_code);

    MessageLog.findOneAndUpdate({ message_id: message_id }, { $set: {status: status, status_code: status_code, error: error }}, { new: true }).then((messageLog) => {
      winston.verbose("(wab) status of message_id " + message_id + " updated to " + status);
      winston.info("(wab) messageLog updated ", messageLog);
      console.log("messageLog: ", messageLog)

      this.sendLogWebhook(messageLog);
    }).catch((err) => {
      winston.error("(wab) findOneAndUpdate error: ", err);
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

  sendLogWebhook(messageLog) {
    this.tdClient.sendSupportMessage(
      "support-group-62c3f10152dc7400352bab0d-whatsapplog",
      { text: "Whatsapp Log", attributes: { messageLog: messageLog} },
      (err) => {
        if (err) {
          console.error("Error sending reply:", err);
        }
        console.log("Reply message sent");
        
    });

  }

}

module.exports = { WhatsappLogger };
