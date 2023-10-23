var JobManager = require("jobs-worker-queued");
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
    jobManager = new JobManager(this.AMQP_MANAGER_URL);

  }

  goSchedule(mydata) {
    try {
      console.log('Class/Schedule/Data arrived in scheduler: ', mydata);
      jobManager.publish(mydata);
      return { success: true, msg: 'scheduling success!' };
    } catch (err) {
      console.error('GET scheduling ERROR ', err);
      return { success: false, msg: 'Error in scheduling!.' };
    }
  }
}


module.exports = { Scheduler };