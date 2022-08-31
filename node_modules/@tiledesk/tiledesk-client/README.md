Full [NodeJS API reference](https://tiledesk.github.io/tiledesk-nodejs-libs/TiledeskClient.html) is hosted on Github

# Introduction

Follow this guide to use the Tiledesk JavaScript SDK in your ``Node.js`` application.

Before you can add Tiledesk to your Node.js app, you need a [Tiledesk account](https://docs.tiledesk.com/knowledge-base/creating-a-tiledesk-account/) and a [Tiledesk project](https://docs.tiledesk.com/knowledge-base/creating-a-tiledesk-account/). Once you create your project you will have a _projectID_, a _user_ to play with project APIs, a _project secret_ for custom authentication and all the stuff need to work with Tiledesk and his APIs.

# Add Tiledesk to your project

Install ``TiledeskClient`` library with *npm* command:

```
npm install @tiledesk/tiledesk-client
```

Alternatively use package.json to import the library in the "dependencies" property, as in the following example:

```json
{
  "name": "Hello Tiledesk nodeJS",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node index.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@tiledesk/tiledesk-client": "^0.8.5"
  }
}
```

Then run

```
npm install
```

Once installed you can import ```TiledeskClient()``` class in your Node.js file using the "require" command:

```
const { TiledeskClient } = require('@tiledesk/tiledesk-client');
```

# Authentication

Before you can interact with Tiledesk APIs you need to authenticate.
Tiledesk provides three authentication methods.

1. Authentication with email and password
2. Authentication as anonymous user
3. Custom authentication

## Authentication with *email* and *password*

This is the authentication method that you need when working with Tiledesk APIs. Every API methods, except authentication ones, work on a *project* + *role* + *token* basis.
To authenticate and get a *token* with email and password use the ``authEmailPassword()`` method from the TiledeskClient class.
You must provide the APIKEY to authenticate. Actually APIKEYs are experimental and can be omitted. Just use the string 'APIKEY' in place of the real one.

```javascript
TiledeskClient.authEmailPassword(
  'APIKEY',
  /* EMAIL */,
  /* PASSWORD */,
  null,
  function(err, result) {
      if (!err && result) {
          console.log('You got your auth token!', result.token);
          console.log('Your user ID!', result.user._id);
      }
  else {
      console.err("An error occurred", err);
  }
});
```

In response you will get a *token* to interact with APIs using your account and the corresponding *user ID*.

## Authentication as Anonymous user
This authentication method is useful for anonymous user that need to interact with support APIs

```javascript
TiledeskClient.anonymousAuthentication(
  PROJECT_ID,
  APIKEY,
  null,
  function(err, result) {
    assert(result.token != null);
    let token = result.token;
  }
);
```

In response you will get a *token* to interact with APIs in anonymous mode.

## Custom authentication
With custom authentication you can work with your own users making them auto-signin in Tiledesk without previous signup. This can be used in the place of anonymous authentication to certify users coming from external application, giving them a certified identity in Tiledesk.

For this example import uuid:

```
npm install uuid
```

```javascript
const { v4: uuidv4 } = require('uuid');
var externalUserId = uuidv4();
var externalUser = {
    _id: externalUserId,
    firstname:"John",
    lastname:"Wick",
    email: "john@wick.com"
};
var signOptions = {                                                            
  subject:  'userexternal',
  audience:  'https://tiledesk.com/projects/' + YOUR_PROJECT_ID
};
var jwtCustomToken = "JWT " + jwt.sign(externalUser, YUOR_PROJECT_SECRET, signOptions);

TiledeskClient.customAuthentication(
  jwtCustomToken,
  APIKEY,
  null,
  function(err, result) {
      if (!err && result) {
          let token = result.token;
      }
  }
);
```

# The TiledeskClient class

To interact with Tiledesk APIs you need to create an instance of a TiledeskClient() class using his constructor. You MUST supply an *APIKEY*, an existing *Project ID* and a valid *token*, this last one got through some of the authentication methods above.

In the next example we first authenticate using our user credentials, then we create a new TiledeskClient instance using a ``PROJECT_ID`` and the ``token`` we got from authentication:

```javascript
TiledeskClient.authEmailPassword(
  'APIKEY',
  /* EMAIL */,
  /* PASSWORD */,
  null,
  function(err, result) {
      if (!err && result) {
          console.log('You got the token!', result.token);
          const tdclient = new TiledeskClient({
              APIKEY: /* APIKEY */,
              projectId: /* PROJECT_ID */,
              token: result.token
          });
      }
  else {
      console.err("An error occurred", err);
  }
});
```

# Working with support requests

A Support Request is a set of metadata and messages that describe whole conversation. A Support Request contains data regarding the Request status (open/assigned/closed etc.), the web/app source page of the conversation, the end-user ID, his email etc. The main information consist of the messages sent and received by the request. Using messaging APIs is indeed the most common way to interact with the request.

Yiou can interact with the request messages using [Messaging APIs](https://developer.tiledesk.com/apis/rest-api/messages). Or you can interact directly with Request's metadata using the [Request APIs](https://developer.tiledesk.com/apis/rest-api/requests).

## Create a support request

To create a support request you simply send a message to a not-existing request ID. A request is automcatically created when you send a message to a no-existing request.

It's up to you to create a new, UNIQUE request ID, following the Tiledesk rules. If you don't want to know how to create a new request ID, to get a new one you can use the static function ``TiledeskClient.newRequestId()`` passing ``PROJECT_ID`` as a parameter, as in the following example:


```
const text_value = 'test message';
const request_id = TiledeskClient.newRequestId(PROJECT_ID);
tdclient.sendSupportMessage(
  request_id,
  {text: text_value},
  (err, result) => {
    assert(err === null);
    assert(result != null);
    assert(result.text === text_value);
});
```

As soon as you send a new message to Tiledesk with the new requestID, the request is created and ready to be processed. 


With the same *sendSupportMessage()* function you can send additional messages to the request. In this example we send a second message to the request using the same request id we used to create the request in the previous example.

```
tdclient.sendSupportMessage(
  request_id,
  {text: 'second message'},
  (err, result) => {
    assert(err === null);
    assert(result != null);
    assert(result.text === text_value);
});
```

With Tiledesk you can also [get sent messages](https://developer.tiledesk.com/apis/tutorials/rest-api/sending-and-receiving-messages) to a request's conversation using Webhooks, subscribing to the Message.create event.

## Get a support request by id

```
let REQUEST_ID = /* THE REQUEST ID */;
tdclient.getRequestById(REQUEST_ID, (err, result) => {
    const request = result;
    if (request.request_id != null) {
      console.log("Got request with first text:", request.first_text);
    }
});
```

## Query support requests

```
tdclient.getAllRequests(
  {
      limit: 1,
      status: TiledeskClient.UNASSIGNED_STATUS
  },
  (err, result) => {
    assert(result);
    const requests = result.requests;
    assert(requests);
    assert(result.requests);
    assert(Array.isArray(requests));
    assert(result.requests.length > 0);
  }
);
```

# Working with teamates

A Project's **teammate** is a user who collaborates with you on a specific project.

While the name on the *User Interface* and documentaion level is always teammate, on the APIs level a teamate is called *ProjectUser*. As the the name suggests, a ProjectUser is a Tiledesk User invited with a specific role on a specific Project.

## Update teamate status to available/unavailable

With ``TiledeskClient.updateProjectUserCurrentlyLoggedIn()`` you will update the status of the user token in the TiledeskClient constructor.

```javascript
const tdclient = new TiledeskClient({
    APIKEY: /* APIKEY */,
    projectId: /* PROJECT_ID */,
    token: result.token
});
tdclient.updateProjectUserCurrentlyLoggedIn(
    {
        user_available: true
    },
    function(err, result) {
        if (!err && result) {
            assert(result);
            assert(result.user_available === true);
        }
    }
);
```

## Check teamate status

```javascript
const tdclient = new TiledeskClient({
    APIKEY: /* APIKEY */,
    projectId: /* PROJECT_ID */,
    token: result.token
});
tdclient.getProjectUser(
  USER_ID,
  function(err, result) {
      if (!err && result) {
          assert(Array.isArray(result));
          assert(result[0]._id != null);
          assert(result[0].user_available === true);
          let PROJECT_USER_ID = result[0]._id;
      }
      else {
          assert.ok(false);
      }
  }
);
```

The ``PROJECT_USER_ID`` variable is the teamate ID of your user (``USER_ID``) on the ``PROJECT_ID`` you specified in the TiledeskClient custructor.

# Switch between Cloud and Self hosted instances

## Self hosted option

These APIs automatically work with the Tiledesk cloud instance.

If you are running your own self-hosted instance of Tiledesk, the APIs provide a specific option to select your endpoint.

### Specify the API endpoint in class methods

If you are using a class method, i.e. authentication methods, use the ``options.APIURL`` parameter to specify the endpoint, as in the following example:

<pre>
TiledeskClient.authEmailPassword(
    APIKEY,
    EMAIL,
    PASSWORD,
    {
      <b>APIURL</b>: API_ENDPOINT
    }
});
</pre>

### Specify the API endpoint in instance methods

If instead you are using instance methods working with an instance of TiledeskClient, you must specify the parameter in the constructor config object as config.APIRUL:

<pre>
const tdclient = new TiledeskClient({
    APIKEY: APIKEY,
    projectId: PROJECT_ID,
    token: YOUR_TOKEN,
    <b>APIURL</b>: API_ENDPOINT
})
</pre>



