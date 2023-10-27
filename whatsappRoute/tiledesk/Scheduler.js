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
    console.log("--> AMQP_MANAGER_URL: ", this.AMQP_MANAGER_URL);
    jobManager = new JobManager(this.AMQP_MANAGER_URL, {
      debug: true,
      topic: "testMIrco111",
      exchange: "testMIrco111"
    });
    console.log("--> jobManager: ", jobManager);
  }

  goSchedule(mydata) {
    mydata.date = new Date();
    console.log('Data: ', mydata.date);
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