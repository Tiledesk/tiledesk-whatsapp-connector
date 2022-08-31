var assert = require('assert');
const { TiledeskClient } = require('..');
const { v4: uuidv4 } = require('uuid');
var jwt = require('jsonwebtoken');
require('dotenv').config();

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const PROJECT_ID = process.env.PROJECT_ID;
const PROJECT_NAME = process.env.PROJECT_NAME;
const PROJECT_SECRET = process.env.PROJECT_SECRET;
const API_ENDPOINT = process.env.API_ENDPOINT;
const APIKEY = process.env.APIKEY;
const LOG_STATUS = (process.env.LOG_STATUS && process.env.LOG_STATUS) === 'true' ? true : false;

// set during the test
let USER_TOKEN = null;
let PROJECT_USER_ID = null;
let USER_ID = null;
let ANONYM_USER_TOKEN = null;
const FAKE_USER_TOKEN = 'JWT ' + uuidv4();

describe('TiledeskClient', function() {
    describe('init() with projectId & token', function() {
      it('should return a new TiledeskClient', function() {
        const tdclient = new TiledeskClient({
            APIKEY: APIKEY,
            APIURL: API_ENDPOINT,
            projectId: PROJECT_ID,
            token: FAKE_USER_TOKEN,
            log: LOG_STATUS
        })
        if (tdclient) {
            assert(tdclient != null);
            assert(tdclient.APIURL === API_ENDPOINT);
            assert(tdclient.projectId === PROJECT_ID);
            assert(tdclient.jwt_token === FAKE_USER_TOKEN);
            assert(tdclient.APIKEY === APIKEY);
            assert(tdclient.log === LOG_STATUS);
        }
        else {
            assert.ok(false);
        }
      });
    });
});

describe('TiledeskClient', function() {
    describe('anonymousAuthentication()', function() {
        it('should return the auth token', function(done) {
            // const tdclient = new TiledeskClient({
            //     APIKEY: APIKEY,
            //     APIURL: API_ENDPOINT,
            //     projectId: PROJECT_ID,
            //     log: LOG_STATUS
            // })
            // if (tdclient) {
            //   assert(tdclient != null);
              TiledeskClient.anonymousAuthentication(
                PROJECT_ID,
                APIKEY,
                {
                    APIURL: API_ENDPOINT,
                    log: false
                },
                function(err, result) {
                    if (!err && result) {
                        assert(result.token != null);
                        ANONYM_USER_TOKEN = result.token;
                        done();
                    }
                    else {
                        assert.ok(false);
                    }
                }
              );
            // }
            // else {
            //     assert.ok(false);
            // }
        });
    });
});

describe('TiledeskClient', function() {
    describe('authEmailPassword()', function() {
        it('should return the auth token', function(done) {
            // const tdclient = new TiledeskClient({
            //     APIKEY: APIKEY,
            //     APIURL: API_ENDPOINT,
            //     log: LOG_STATUS
            // })
            // if (tdclient) {
            //   assert(tdclient != null);
              TiledeskClient.authEmailPassword(
                  APIKEY,
                  EMAIL,
                  PASSWORD,
                  {
                    APIURL: API_ENDPOINT,
                    log: LOG_STATUS
                  },
                function(err, result) {
                    if (!err && result) {
                        assert(result.success == true);
                        assert(result.token != null);
                        assert(result.user)
                        assert(result.user._id !== null);
                        assert(result.user.email !== null);
                        USER_TOKEN = result.token;
                        USER_ID = result.user._id;
                        done();
                    }
                else {
                    assert.ok(false);
                }
              });
            // }
            // else {
            //     assert.ok(false);
            // }
        });
    });
});

describe('TiledeskClient', function() {
    describe('customAuthentication()', function() {
        it('should return the auth token', function(done) {
            // const tdclient = new TiledeskClient({
            //     APIKEY: APIKEY,
            //     APIURL: API_ENDPOINT,
            //     log: LOG_STATUS
            // })
            // if (tdclient) {
            //   assert(tdclient != null);
              var externalUserId = uuidv4();
              var externalUser = {
                  _id: externalUserId,
                  firstname:"John",
                  lastname:"Wick",
                  email: "john@wick.com"
              };
              var signOptions = {                                                            
                subject:  'userexternal',
                audience:  'https://tiledesk.com/projects/' + PROJECT_ID
              };
              var jwtCustomToken = "JWT " + jwt.sign(externalUser, PROJECT_SECRET, signOptions);
              
              TiledeskClient.customAuthentication(
                jwtCustomToken,
                APIKEY,
                {
                    APIURL: API_ENDPOINT,
                    log: LOG_STATUS
                },
                function(err, result) {
                    if (!err && result) {
                        // console.log("result.token", result.token);
                        assert(result.token != null);
                        done();
                    }
                    else {
                        assert.ok(false);
                    }
                }
              );
            // }
            // else {
            //     assert.ok(false);
            // }
        });
    });
});

describe('TiledeskClient', function() {
  describe('fireEvent()', function() {
    it('should return the event echo json if fired correctly', function(done) {
        const tdclient = new TiledeskClient({
            APIKEY: APIKEY,
            APIURL: API_ENDPOINT,
            projectId: PROJECT_ID,
            token: ANONYM_USER_TOKEN,
            log: LOG_STATUS
        })
        // tdclient.anonymousAuthentication(
        //     PROJECT_ID,
        //     function(err, result) {
        //         if (!err && result.token) {
                    const event = {
                        name: "faqbot.answer_not_found",
                        attributes: {
                            bot: {
                                _id: "testbot_id",
                                name: "testbot_name"
                            },
                            message: {
                                text: "help"
                            }
                        }
                    };
                    tdclient.fireEvent(event, function(err, result) {
                        assert.strictEqual(result.name, "faqbot.answer_not_found");
                        done();
                    });
            //     }
            //     else {
            //         assert.ok(false);
            //     }
            // });
    });
  });
});

describe('TiledeskClient', function() {
    describe('getProjectSettings()', function() {
        it('gets the project settings', function(done) {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            if (tdclient) {
            //   tdclient.authEmailPassword(EMAIL, PASSWORD, function(err, result) {
                tdclient.getProjectSettings(
                    function(err, resbody) {
                        if (!err && resbody) {
                            assert(resbody.name === PROJECT_NAME);
                            done();
                        }
                        else {
                            assert.ok(false);
                        }
                    }
                );
            //   })
              
            }
            else {
                assert.ok(false);
            }
        });
    });
});

  // ***************************************************
  // ********************* TEAM ************************
  // ***************************************************

describe('TiledeskClient', function() {
    describe('updateProjectUser()', function() {
        it('updates the project-user status to AVAILABLE', function(done) {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            if (tdclient) {
                tdclient.updateProjectUserCurrentlyLoggedIn(
                    {
                        user_available: true
                    },
                    function(err, result) {
                        // console.log("ProjectUser (teammate):::::::::", result);
                        if (!err && result) {
                            assert(result);
                            assert(result.user_available === true);
                            // PROJECT_USER_ID = result[0]._id;
                            done();
                        }
                        else {
                            assert.ok(false);
                        }
                    }
                );
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('getProjectUser()', function() {
        it('gets the project-user by userId and verifies that he is AVAILABLE', function(done) {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            if (tdclient) {
                tdclient.getProjectUser(
                    USER_ID,
                    function(err, result) {
                        // console.log("getProjectUser (teammate):", result);
                        if (!err && result) {
                            assert(Array.isArray(result));
                            assert(result[0]._id != null);
                            assert(result[0].user_available === true);
                            PROJECT_USER_ID = result[0]._id;
                            done();
                        }
                        else {
                            assert.ok(false);
                        }
                    }
                );
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('updateProjectUserCurrentlyLoggedIn()', function() {
        it('updates the project-user status to unavailable', function(done) {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            if (tdclient) {
                tdclient.updateProjectUserCurrentlyLoggedIn(
                    {
                        user_available: false
                    },
                    function(err, result) {
                        // console.log("ProjectUser (teammate):", result);
                        if (!err && result) {
                            assert(result);
                            assert(result.user_available === false);
                            // assert(result[0]._id != null);
                            // PROJECT_USER_ID = result[0]._id;
                            done();
                        }
                        else {
                            assert.ok(false);
                        }
                    }
                );
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('getProjectUser()', function() {
        it('verifies the project-user status is unavailable', function(done) {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            if (tdclient) {
                tdclient.getProjectUser(
                    USER_ID,
                    function(err, result) {
                        if (!err && result) {
                            assert(Array.isArray(result));
                            assert(result[0]._id != null);
                            assert(result[0].user_available === false);
                            done();
                        }
                        else {
                            assert.ok(false);
                        }
                    }
                );
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('getTeam()', function() {
        it('gets all the project users (the team)', function(done) {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            if (tdclient) {
                tdclient.getTeam(
                    (err, teammates) => {
                        if (!err && teammates) {
                            console.log("TEAM IS", teammates);
                            assert(teammates != null);
                            assert(teammates.length > 0);
                            done();
                        }
                        else {
                            assert.ok(false);
                        }
                    }
                );
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('openNow()', function() {
        it('should return false because of project not having open hours setup', function(done) {
            const tdclient = new TiledeskClient({
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: ANONYM_USER_TOKEN,
                log: LOG_STATUS
            });
            if (tdclient) {
              assert(tdclient != null);
              tdclient.openNow(function(err, result) {
                assert(err === null);
                assert(result.isopen === true);
                done();
              });
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('getWidgetSettings()', function() {
        it('Widget settings JSON', function(done) {
            const tdclient = new TiledeskClient({
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: ANONYM_USER_TOKEN,
                log: LOG_STATUS
            });
            if (tdclient) {
              assert(tdclient != null);
              tdclient.getWidgetSettings(function(err, result) {
                assert(err === null);
                assert(result != null);
                done();
              });
            }
            else {
                assert.ok(false);
            }
        });
    });
});


  // *******************************************************
  // ********************* REQUESTS ************************
  // *******************************************************

describe('TiledeskClient', function() {
    describe('sendSupportMessage() anonymous to create a new request', function() {
        it('sends a message to a new request conversation to create the support conversation', function(done) {
            const tdclient = new TiledeskClient({
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: ANONYM_USER_TOKEN,
                log: LOG_STATUS
            });
            if (tdclient) {
              assert(tdclient != null);
                const text_value = 'test message';
                const request_id = TiledeskClient.newRequestId(PROJECT_ID);
                tdclient.sendSupportMessage(request_id, {text: text_value}, function(err, result) {
                    assert(err === null);
                    assert(result != null);
                    assert(result.text === text_value);
                    done();
                });
            }
            else {
                assert.ok(false);
            }
        });
    });
});

// TODO: this one never passes. BUG!
describe('TiledeskClient', function() {
    describe('sendSupportMessage() anonymous to throw an error (text is empty)', function() {
        it('sends a message to a new request conversation to create the support conversation', function(done) {
            const tdclient = new TiledeskClient({
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: ANONYM_USER_TOKEN,
                log: this.LOG_STATUS
            });
            if (tdclient) {
              assert(tdclient != null);
                const text_value = '';
                const request_id = TiledeskClient.newRequestId(PROJECT_ID);
                tdclient.sendSupportMessage(request_id, {text: text_value}, function(err, result) {
                    //console.log("Error", err)
                    assert(err);
                    done();
                });
            }
            else {
                assert.ok(false);
            }
        });
    });
});

// DEPRECATED! DO NOT USE! BUILD ANOTHER ONE, WITH SAME DATA PARADIGM OF THIS TEST (NO STATIC IDS)
// describe('TiledeskClient', function() {
//     describe('sendSupportMessage() anonymous to throw an error (text is empty)', function() {
//         it('sends a message to a new request conversation to create the support conversation', function(done) {
//             const tdclient = new TiledeskClient({
//                 APIKEY: APIKEY,
//                 APIURL: API_ENDPOINT,
//                 projectId: '61bd916e784b470035a73ca4',
//                 token: 'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3ZWJob29rX2VuYWJsZWQiOnRydWUsInR5cGUiOiJpbnRlcm5hbCIsImxhbmd1YWdlIjoiZW4iLCJfaWQiOiI2MWJkOTFjZDc4NGI0NzAwMzVhNzNkN2EiLCJuYW1lIjoiV09QUiIsImRlc2NyaXB0aW9uIjoiV2FyIE9wZXJhdGlvbiBQbGFuIFJlc3BvbnNlIiwiaWRfcHJvamVjdCI6IjYxYmQ5MTZlNzg0YjQ3MDAzNWE3M2NhNCIsInRyYXNoZWQiOmZhbHNlLCJjcmVhdGVkQnkiOiI1ZTA5ZDE2ZDRkMzYxMTAwMTc1MDZkN2YiLCJjcmVhdGVkQXQiOiIyMDIxLTEyLTE4VDA3OjQ2OjIxLjAyOFoiLCJ1cGRhdGVkQXQiOiIyMDIxLTEyLTE4VDA4OjA3OjM4LjI3NFoiLCJfX3YiOjAsIndlYmhvb2tfdXJsIjoiaHR0cHM6Ly93YXJnYW1lcy50aWxlZGVzay5yZXBsLmNvL215dGlsZWRlc2siLCJpYXQiOjE2Mzk4OTYxNTQsImF1ZCI6Imh0dHBzOi8vdGlsZWRlc2suY29tL2JvdHMvNjFiZDkxY2Q3ODRiNDcwMDM1YTczZDdhIiwiaXNzIjoiaHR0cHM6Ly90aWxlZGVzay5jb20iLCJzdWIiOiJib3QiLCJqdGkiOiJmNDVlZTU5Ni0wNTMyLTQ5MzAtODM5My0wYzQ0NGQ4YzE2MjcifQ.D9IEe2Lj-a5-KRcZX8kYAk7TTHwYDjhc-xx0uBINqJY',
//                 log: false
//             });
//             if (tdclient) {
//               assert(tdclient != null);
//                 const text_value = '';
//                 const request_id = 'support-group-61bd916e784b470035a73ca4-3ce95e2ec392420ab3b3e7d697ec5114';
//                 tdclient.sendSupportMessage(request_id, {text: text_value}, function(err, result) {
//                     if (err) {
//                         console.error("An error occurred:", err)
//                     }
//                     assert.equal(err, null);
//                     assert.notEqual(result, null);
//                     assert.equal(result.text, text_value);
//                     done();
//                 });
//             }
//             else {
//                 assert.ok(false);
//             }
//         });
//     });
// });

describe('TiledeskClient', function() {
    describe('Assign the request without a bot', function() {
        it('sends a message to a new request conversation to create the support conversation, the it assigns the request to a human, bypassing the bot', function(done) {
            const tdclient = new TiledeskClient({
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: ANONYM_USER_TOKEN,
                log: LOG_STATUS
            });
            if (tdclient) {
              assert(tdclient != null);
                const text_value = 'test message';
                const request_id = TiledeskClient.newRequestId(PROJECT_ID);
                tdclient.sendSupportMessage(request_id, {text: text_value}, function(err, result) {
                    assert(err === null);
                    assert(result != null);
                    assert(result.text === text_value);
                    // just to get the departmentId of the request.
                    const tdclient_user = new TiledeskClient(
                        {
                            APIKEY: APIKEY,
                            APIURL: API_ENDPOINT,
                            projectId: PROJECT_ID,
                            token: USER_TOKEN,
                            log: LOG_STATUS
                        })
                        tdclient_user.getRequestById(request_id, (err, result) => {
                        console.log("RICHIESTA:", err, JSON.stringify(result))
                        assert(result != null);
                        const request = result;
                        assert(request.request_id != null);
                        assert(request.request_id === request_id);
                        // done();
                        const departmentId = request.department._id;
                        // const departmentName = request.department.name;
                        tdclient_user.assign(request_id, departmentId, {nobot: true}, (err, result) => {
                            assert(err === null);
                            assert(result != null);
                            console.log("Successfully reassigned request:", request_id);
                            done();
                        });
                    });
                    
                });
            }
            else {
                assert.ok(false);
            }
        });
    });
});

describe('TiledeskClient', function() {
    describe('getAllRequests()', function() {
        it('gets the project requests', (done) => {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            tdclient.getAllRequests(
                {
                    limit: 1,
                    status: TiledeskClient.UNASSIGNED_STATUS
                }, (err, result) => {
                assert(result);
                const requests = result.requests;
                assert(requests);
                assert(result.requests);
                assert(Array.isArray(requests));
                assert(result.requests.length > 0);
                done();
            },
            {
                additional_params: {
                    "no_populate": "true",
                    "snap_department_routing": "assigned"
                }
            });
                // }
            //   });
              
            // }
            // else {
            //     assert.ok(false);
            // }
        });
    });
});

describe('TiledeskClient', function() {
    describe('getRequestById()', function() {
        it('gets a request by his ID', (done) => {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            const limit = 1;
            tdclient.getAllRequests(
                {
                    limit: 1,
                    status: TiledeskClient.UNASSIGNED_STATUS
                }, (err, result) => {
                assert(result);
                const requests = result.requests;
                assert(requests);
                assert(result.requests);
                assert(Array.isArray(requests));
                assert(result.requests.length > 0);
                const request = requests[0];
                assert(request.request_id != null);
                first_request_id = request.request_id;
                tdclient.getRequestById(first_request_id, (err, result) => {
                    console.log("RICHIESTA", JSON.stringify(result))
                    assert(result != null);
                    const request = result;
                    assert(request.request_id != null);
                    assert(request.request_id === first_request_id);
                    done();
                });
            },
            {
                additional_params: {
                    "no_populate": "true",
                    "snap_department_routing": "assigned"
                }
            });
                // }
            //   });
              
            // }
            // else {
            //     assert.ok(false);
            // }
        });
    });
});

  // ***************************************************
  // ********************* BOTS ************************
  // ***************************************************

  describe('TiledeskClient', function() {
    describe('createBot()', function() {
        it('creates a native bot, then deletes it', (done) => {
            const bot_name = "my bot " + uuidv4();
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            tdclient.createBot(bot_name, false, null, (err, result) => {
                //console.log("result", result);
                assert(!err);
                assert(result);
                assert(result.type === 'internal');
                assert(result.name === bot_name);
                assert(result._id);
                tdclient.deleteBot(result._id, (err, result) => {
                    assert(!err);
                    assert(result);
                    done();
                });
            });
        });
    });
});

describe('TiledeskClient', function() {
    describe('updateBot()', function() {
        it('creates, updates and deletes a native bot', (done) => {
            const bot_name = "my bot " + uuidv4();
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            tdclient.createBot(bot_name, false, null, (err, result) => {
                //console.log("result", result);
                assert(!err);
                assert(result);
                assert(result.type === 'internal');
                assert(result.name === bot_name);
                assert(result._id);
                const bot_id = result._id;
                const new_bot_name = "new bot name";
                tdclient.updateBot(bot_id, new_bot_name, false, null, (err, result) => {
                    assert(!err);
                    assert(result);
                    assert(result.type === 'internal');
                    assert(result.name === new_bot_name);
                    assert(result._id);
                    assert(result._id === bot_id);
                    tdclient.deleteBot(bot_id, (err, result) => {
                        assert(!err);
                        assert(result);
                        done();
                    });
                });
            });
        });
    });
});

describe('TiledeskClient', function() {
    describe('getBot()', function() {
        it('gets a bot by id: 1. create a bot, 2. query bots, 3. delete created bot', (done) => {
            const bot_name = "my bot " + uuidv4();
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            tdclient.createBot(bot_name, false, null, (err, result) => {
                //console.log("result", result);
                assert(result);
                assert(result.type === 'internal');
                assert(result.name === bot_name);
                assert(result._id !== null);
                tdclient.getBot(result._id, (err, result) => {
                    //console.log("bot:", result);
                    tdclient.deleteBot(result._id, (err, result) => {
                        assert(!err);
                        assert(result);
                        done();
                    });
                });
            });
        });
    });
});

describe('TiledeskClient', function() {
    describe('getAllBots()', function() {
        it('creates 2 bots and gets all bots, then deletes the 2 bots.', (done) => {
            const bot_name1 = "my bot " + uuidv4();
            const bot_name2 = "my bot " + uuidv4();
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            tdclient.createBot(bot_name1, false, null, (err, result) => {
                //console.log("result", result);
                assert(result);
                assert(result.type === 'internal');
                assert(result.name === bot_name1);
                assert(result._id !== null);
                const bot1_id = result._id;
                tdclient.createBot(bot_name2, false, null, (err, result) => {
                    //console.log("result", result);
                    assert(result);
                    assert(result.type === 'internal');
                    assert(result.name === bot_name2);
                    assert(result._id !== null);
                    const bot2_id = result._id;
                    tdclient.getAllBots((err, result) => {
                        console.log("bots:", result.length);
                        assert(result.length >= 2);
                        tdclient.deleteBot(bot1_id, (err, result) => {
                            assert(!err);
                            assert(result);
                            tdclient.deleteBot(bot2_id, (err, result) => {
                                assert(!err);
                                assert(result);
                                done();
                            });
                        });
                    });
                });
            });
        });
    });
});

// *********** INTENTS **********

describe('TiledeskClient', function() {
    describe('create a Faq, query the faq by intent display name', function() {
        it('1. create a bot, 2. create a faq, 3. query the faq by intent display name, 4. delete created bot', (done) => {
            const bot_name = "my bot " + uuidv4();
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: LOG_STATUS
            })
            tdclient.createBot(bot_name, false, null, (err, thebot) => {
                console.log("bot created:", thebot);
                assert(thebot);
                assert(thebot.type === 'internal');
                assert(thebot.name === bot_name);
                assert(thebot._id !== null);
                const intent_display_name = "mytestintent"
                tdclient.createIntent(thebot._id, intent_display_name, "My question", "My answer", "en", false, (err, thefaq) => {
                    console.log("intent created", thefaq);
                    assert(thefaq);
                    tdclient.getIntents(thebot._id, intent_display_name, 0, 0, null, (err, faqs) => {
                        console.log("the faqs", faqs.length)
                        assert(faqs.length == 1);
                        assert(faqs[0]);
                        assert(faqs[0].intent_display_name === intent_display_name);
                        tdclient.getIntents(thebot._id, "unknown", 0, 0, null, (err, faqs) => {
                            console.log("the faqs", faqs.length)
                            assert(faqs.length == 0);
                            tdclient.deleteBot(thebot._id, (err, result) => {
                                assert(!err);
                                assert(result);
                                done();
                            });
                        });
                    });
                    
                });
            });
        });
    });
});

// *********** ORCHESTERATION ***********

describe('TiledeskClient', function() {
    describe('changeBot()', function() {
        it('change a conversation bot (who had no bots)', (done) => {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: false
            })
            // 1. Creates a request
            const text_value = 'test message';
            const request_id = TiledeskClient.newRequestId(PROJECT_ID);
            tdclient.sendSupportMessage(request_id, {text: text_value}, function(err, result) {
                assert(err === null);
                assert(result != null);
                assert(result.text === text_value);
                const bot_name = "my bot " + uuidv4();
                // 2. Creates a bot
                tdclient.createBot(bot_name, false, null, (err, bot) => {
                    // console.log("bot created:", bot);
                    assert(bot);
                    assert(bot.type === 'internal');
                    assert(bot.name === bot_name);
                    assert(bot._id !== null);
                    const bot_id = 'bot_' + bot._id;
                    // 3. Changes the bot (adding effectively)
                    tdclient.changeBot(request_id, bot_id, (err) => {
                        assert(err == null);
                        tdclient.getRequestById(request_id, (err, request) => {
                            assert(request.participantsBots != null);
                            assert(request.participantsBots.length > 0);
                            assert(request.participantsBots[0] === bot._id);
                            done();
                        });
                    });
                });
            });
        });
    });
});

describe('TiledeskClient', function() {
    describe('changeBot()', function() {
        it('change a conversation bot (with a previous bot)', (done) => {
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: false
            })
            
            // 1. Creates a request
            const text_value = 'test message';
            const request_id = TiledeskClient.newRequestId(PROJECT_ID);
            tdclient.sendSupportMessage(request_id, {text: text_value}, function(err, result) {
                assert(err === null);
                assert(result != null);
                assert(result.text === text_value);
                const bot_name = "my bot " + uuidv4();
                // 2. Creates a bot
                tdclient.createBot(bot_name, false, null, (err, bot) => {
                    // console.log("bot created:", bot);
                    assert(bot);
                    assert(bot.type === 'internal');
                    assert(bot.name === bot_name);
                    assert(bot._id !== null);
                    const bot_id = 'bot_' + bot._id;
                    // 3. Adds the bot to the request
                    tdclient.addRequestParticipant(request_id, bot_id, (err, result) => {
                        const bot_name2 = "my bot " + uuidv4();
                        // 4. Creates a second bot
                        tdclient.createBot(bot_name2, false, null, (err, bot) => {
                            // console.log("bot2 created:", bot);
                            assert(bot);
                            assert(bot.type === 'internal');
                            assert(bot.name === bot_name2);
                            assert(bot._id !== null);
                            const bot_id2 = 'bot_' + bot._id;
                            // 5. Changes the bot
                            tdclient.changeBot(request_id, bot_id2, (err) => {
                                assert(err == null);
                                tdclient.getRequestById(request_id, (err, request) => {
                                    assert(request.participantsBots != null);
                                    assert(request.participantsBots.length > 0);
                                    assert(request.participantsBots[0] === bot._id);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// **************** DEPARTMENTS *****************

describe('TiledeskClient', function() {
    describe('createDepartment() getAllDepartments() deleteDepartment() getDepartment()', function() {
        it('creates 2 deps and gets all deps, then deletes the 2 deps.', (done) => {
            const dep_name1 = "my dep " + uuidv4();
            const dep_name2 = "my dep " + uuidv4();
            const tdclient = new TiledeskClient(
            {
                APIKEY: APIKEY,
                APIURL: API_ENDPOINT,
                projectId: PROJECT_ID,
                token: USER_TOKEN,
                log: this.LOG_STATUS
            })
            tdclient.createDepartment(dep_name1, null, null, null, (err, result) => {
                // console.log("result", result);
                assert(result);
                assert(result.default === false);
                assert(result.routing === null);
                assert(result.name === dep_name1);
                assert(result._id !== null);
                const dep1_id = result._id;
                // console.log("dep1_id", dep1_id)
                tdclient.createDepartment(dep_name2, 'assigned', null, null, (err, result) => {
                    // console.log("result", result);
                    assert(result);
                    assert(result.default === false);
                    assert(result.name === dep_name2);
                    assert(result._id !== null);
                    const dep2_id = result._id;
                    // console.log("dep2_id", dep2_id)
                    tdclient.getDepartment(dep2_id, (err, result) => {
                        assert(!err);
                        assert(result);
                        assert(result.default === false);
                        assert(result.name === dep_name2);
                        assert(result.routing === 'assigned');
                        assert(result._id === dep2_id);
                        tdclient.getAllDepartments((err, result) => {
                            // console.log("deps:", result.length);
                            assert(result.length >= 2);
                            tdclient.deleteDepartment(dep1_id, (err, result) => {
                                assert(!err);
                                assert(result);
                                tdclient.deleteDepartment(dep2_id, (err, result) => {
                                    assert(!err);
                                    assert(result);
                                    done();
                                });
                            });
                        });
                    });
                    
                });
            });
        });
    });
});