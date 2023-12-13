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

    if (!config.JOB_TOPIC_EXCHANGE) {
      throw new Error('config.JOB_TOPIC_EXCHANGE is mandatory');
    }

    this.AMQP_MANAGER_URL = config.AMQP_MANAGER_URL;
    this.JOB_TOPIC_EXCHANGE = config.JOB_TOPIC_EXCHANGE;
    
    this.log = false;
    if (config.log) {
      this.log = config.log;
    }

    jobManager = new JobManager(this.AMQP_MANAGER_URL, {
      debug: false,
      topic: this.JOB_TOPIC_EXCHANGE,
      exchange: this.JOB_TOPIC_EXCHANGE
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