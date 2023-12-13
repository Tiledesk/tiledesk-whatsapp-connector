var JobManager = require("jobs-worker-queued");
var winston = require('../winston');
var jobManager;


class Scheduler {


  constructor(config) {
    if (!config) {
      throw new Error('config is mandatory');
    }

    if (!config.AMQP_MANAGER_URL) {
      throw new Error('config.AMQP_MANAGER_URL is mandatory');
    }

    this.AMQP_MANAGER_URL = config.AMQP_MANAGER_URL;
    this.log = false;
    if (config.log) {
      this.log = config.log;
    }

    jobManager = new JobManager(this.AMQP_MANAGER_URL, {
      debug: false,
      topic: "tiledesk-whatsapp_test",
      exchange: "tiledesk-whatsapp_test"
    });
  }

  async goSchedule(mydata) {
    mydata.date = new Date();
    try {
      winston.debug("(wab) Data arrived to scheduler: ", mydata);
      jobManager.publish(mydata);
      return { success: true, msg: 'scheduling success!' };
    } catch (err) {
      winston.error('(wab) scheduling error ', err);
      return { success: false, msg: 'Error in scheduling' };
    }
  }
}


module.exports = { Scheduler };