var JobManager = require("jobs-worker-queued");
var jobManager;


class Scheduler {


  constructor() {
    jobManager = new JobManager("amqp://eamjynjp:j6Eqqy90WDV_sv_616oyb4Xp7t7nu0as@squid.rmq.cloudamqp.com/eamjynjp");

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