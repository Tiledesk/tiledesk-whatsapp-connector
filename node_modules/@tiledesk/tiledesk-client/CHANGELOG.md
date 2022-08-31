# Client library for Tiledesk nodejs APIs client

This library is on npm: https://www.npmjs.com/package/@tiledesk/tiledesk-client

### 0.8.29
- added createIntent()
- added getIntents()

### 0.8.24
- bug fix

### 0.8.23
- bug fix

### 0.8.22
- bug fix

### 0.8.21
- HMESSAGE_DIRECTIVE constant renamed to: HIDDEN_MESSAGE_DIRECTIVE
- Orchestration APIs, added removeCurrentBot() and normalizeBotId()

### 0.8.20
- added assign() method

### 0.8.19
- fixed doc getTeam() added REST API doc reference

### 0.8.18 - online
- added getTeam()

### 0.8.17 - online
- log fix

### 0.8.16 - online
- changeBot() now takes a simple botId ('bot_' prefix constraint removed)

### 0.8.15 - online
- added orchestration APIs: changeBot, changeBotAndMessage, addParticipantAndMessage

### 0.8.14 - online
- added "console.error("An error occurred:", error)" in TiledeskClient.myrequest "catch" block.

### 0.8.13 - online
- added getDepartment()
- added createDepartment()
- added updateDepartment()
- added deleteDepartment()
- added testing

### 0.8.12 - online
- added getDepartments() -> TODO TEST
- added getAllDepartments() -> TODO TEST

### 0.8.11
- added test for empty text

### 0.8.10 - online
- bug fix: fixToken() call removed from some methods

### 0.8.9 - online
- bug fix: updateRequestDepartment()

### 0.8.8 - online
- bug fix

### 0.8.7 - online
- added deleteRequestParticipant() -> TODO TEST
- added addRequestParticipant() -> TODO TEST
- added getAllBots()
- added getBot()
- added createBot()
- added updateBot()
- added deleteBot()
- updated documentation

### 0.8.6 - online
- TiledeskClient.myrequest callback refactored to take only 2 parameters: err, resbody

### 0.8.5 - online
- doc fix

### 0.8.4 - online
- added README.md synchronized with https://github.com/Tiledesk/tiledesk-docs/blob/master/apis/nodejs/README.md
- server params for testing moved in .env

### 0.8.3 - online
- changed method signature (token first): customAuthentication(token, apikey, options, callback)

### 0.8.2
- 'project_id' instance property and constructor options property renamed in 'projectId' (camel case)
- updateDepartment() renamed in updateRequestDepartment()
- updateRequestDepartment: in options parameter added 'nobot' option
- added updateProjectUser()
- added documentation with jsdoc
- added getAllRequests()
- added test case for getRequestById()
- sendDirectMessage() renamed in sendChatMessage()
- sendMessage() renamed in sendSupportMessage()
- added newRequestId()
- anonymousAuthentication(callback, options) signature refactored (removed first 'projectId' param, added 'options' param)
- added Axios. Removed Request.
- anonymousAuthentication(), customAuthentication(), authEmailPassword() are now 'static'. Signature modifed to provide 'apikey' and options (APIURL, log).
- options.projectId and options.token are now mandatory in constructor()
- removed tail 'options' parameter from all calls.

### 0.7.14 - online
- added getRequestById()

### 0.7.13 - online
- bug fix - removed from updateLeadEmailFullname(): throw new Error('options.lead_id can NOT be empty.');

### 0.7.12 - online
- added sendDirectMessage()

### 0.7.11 - online
- bug fix - some projectId to project_id

### 0.7.10 - online
- removed token as explicit parameter in some function calls. token is now an optional constructor parameter. It's also supported by "options" parameter in some function calls.
- added customAuthentication()

### 0.7.9 - online
- Added "options" parameter some function calls.
- removed project_id as explicit parameter in some function calls. project_id is now an optional constructor parameter. It's also supported by "options" parameter in some function calls.
- added customAuthentication()

### 0.7.8 - online
- bug fix - Added missing jwt_token() to sendMessage and more.

### 0.7.7 - online
- bug fix: APIURL

### 0.7.6 - online
- added updateProjectUserCurrentlyLoggedIn
- added "options" as last parameter of getRequests to allow adding additional params as no_populate, snap_department etc.

### 0.7.5 - online
- error log refactored adding request and response headers of the http-request

### 0.7.4 - online
- for each call always do: const jwt_token = TiledeskClient.fixToken(token)
- added err.options in error obj replies
- improved log
- added getProjectUser() to test

### 0.7.3 - online
- removed the unused, undocumented "getAllProjectUsers()"


### 0.7.2 - online
- bug fix

### 0.7.1 - online
- Removed raw methods, now creating an instance of TiledeskClient is mandatory, see test 'init()'
- APIKEY is mandatory
- added option to log request and response HTTP calls, see test for the howto
- added automated testing

### 0.6.36 - online
- some methods refactoring

### 0.6.27 - online
- added updateLeadEmailFullname()
- added updateDepartment()
- added updateRequest()
- added dependency declaration in package.json: "request": "^2.88.2"

### 0.6.26 - online
- SendMessageRaw fix: response not defined

### 0.6.25 - online
- introduced myrequest() to decouple "request" lib
- now each method shares the same return callback/error handling

### 0.6.24 - online
- getErr()

### 0.6.22 - online
- added some console.log to openNow()

### 0.6.21 - online
- added: moved request -> myrequesat for openNow()
- fixed: call of fixToken for openNow()

### 0.6.20
- added: test fireEvent()
- added: test anonymousAuthentication()
- added: test openNow()

### 0.6.19
- added: fireEvent() raw method
- added: fireEvent() instance method

### 0.6.18
- added: openNow() instance method
