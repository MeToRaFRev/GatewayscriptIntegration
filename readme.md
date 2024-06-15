# Gatewayscript Integration

This repository provides examples and explanations on how to use Gateway Script for integration in IBM DataPower and API Connect. It addresses the challenges of using callbacks in Gateway Script and demonstrates how to use the `util` module to improve code readability and maintainability.

## Table of Contents

1.  [Introduction](#introduction)
2.  [Util Module](#util-module)
3.  [Skip Backside](#skip-backside)
4.  [Differences between API Connect and DataPower](#differences-between-api-connect-and-datapower)
5.  [Examples](#examples)
    - [Healthcheck](#healthcheck)
    - [Basic Invoke](#basic-invoke)
    - [Converter](#converter)
6.  [Recommendations](#recommendations)
    - [Custom Utils Library](#custom-utils-library)
    - [Environment Flexibility](#environment-flexibility)
7.  [References](#references)

## Introduction

In Gateway Script, many examples use callbacks. While this approach can be suitable for small scripts, it often leads to callback hell in more complex scenarios, making the code hard to understand and maintain. This repository demonstrates how to use the `util` module to avoid callback hell and create more readable, maintainable code.  

Your old policies:

![lowcode-apiconnect](https://i.ibb.co/sRp7VxM/apiconnect.png)

![lowcode-datapower](https://i.ibb.co/34dJC0H/datapower.png)

After this Tutorial:

![code-apiconnect](https://i.ibb.co/34nYnhP/apiconnect-gatewayscript.png)


## Util Module

The `util` module allows us to use `promisify`, which wraps a callback function and converts it into an asynchronous function. This makes the code more readable and easier to debug.

## Skip Backside

Datapower uses client-to-server and server-to-client rules. When using the `sm.setVar('var://service/mpgw/skip-backside', true)`, it will skip the default backend and return the client request. However, if you use the example `BasicInvoke.js`, you will still get to the backend but in the same rule. This allows controlling the whole endpoint using a single rule, which is easier both for the developer and the system itself.

## Differences between API Connect and DataPower

### DataPower Docs

- [DataPower GatewayScript APIs](https://www.ibm.com/docs/en/datapower-gateway/10.5.0?topic=gatewayscript-apis)

### API Connect Docs

- [API Connect GatewayScript Code Examples](https://www.ibm.com/docs/en/api-connect/10.0.5.x_lts?topic=gatewayscript-code-examples)
- Note: API Connect is transitioning to using "context" variables, as detailed in the [API Connect documentation](https://www.ibm.com/docs/en/api-connect/10.0.5.x_lts?topic=aplc-using-context-variables-in-gatewayscript-xslt-policies-datapower-api-gateway).

## Examples

### Healthcheck

```javascript
const sm = require("service-metadata"); // Library
sm.setVar("var://service/mpgw/skip-backside", true); // Set Datapower variable
return session.output.write({ status: "ok" }); // Return response
```

This is a simple Gateway Script to make an endpoint answer `{"status":"ok"}` . This is used to create a health check endpoint for other systems to monitor.

### Basic Invoke

```javascript
const urlopen = require("urlopen"); // Library
const util = require("util"); // Library
const sm = require("service-metadata"); // Library

sm.setVar("var://service/mpgw/skip-backside", true); // Set Datapower variable

const main = async () => {
  // Main function
  const rawBody = session.input; // Read body into a GatewayScript variable
  const body = await util.promisify((rawBody, callback) =>
    rawBody.readAsBuffer(callback)
  )(rawBody); // Read body as buffer.

  const requestData = {
    method: "GET", // Method
    target: "http://example.com", // URL
    data: undefined, // Body (optional based on method)
    timeout: 60, // Timeout in seconds
    headers: { "Content-Type": "application/json" }, // Headers as an object
    sslClientProfile: undefined, // Client profile (if used, it has to be an actual object in the relevant policy)
    agent: undefined, // Custom user agent
  }; // Configure the request

  const rawResponse = await util.promisify(urlopen.open)(requestData); // Make the request
  const response = await util.promisify((rawResponse, callback) =>
    rawResponse.readAsBuffer(callback)
  )(rawResponse); // Read the response
  return session.output.write(response); // Return the response
};

main().catch((err) => {
  console.error(err);
}); // Handle errors
```

This script lets you configure the backend of the endpoint with all its parameters.

### Converter

```javascript
const converter = require("json-xml-converter"); // Library
const rawBody = session.input; // Read body into a GatewayScript variable
const xml2jsonBody = converter.toJSON(
  "badgerfish",
  XML.parse(
    XML.stringify(
      await util.promisify((response, callback) =>
        response.readAsXML(callback)
      )(response)
    )
  )
); // Convert XML to JSON
const json2xmlBody = converter.toXML("badgerfish", JSON.parse(rawBody)); // Convert JSON to XML

session.output.write({ json2xmlBody, xml2jsonBody });
```

## Recommendations

### Custom Utils Library

It is preferred to create some kind of custom utils library to use in your own system. This allows both global policies and more readability based on the usage of the company.

#### API Connect Custom Logs

```javascript
/** Get metadata for logs. */
const getLogParams = () =>
  `Catalog=" ${apim.getvariable("api.catalog.name")}" API=" ${apim.getvariable(
    "api.name"
  )}" Method=" ${apim.getvariable("request.verb")}"`;

/** Print message to the console using "log" level. */
const log = (message) => {
  console.log(getLogParams(), message);
};

/** Print message to the console using "alert" level. */
const alert = (message) => {
  console.alert(getLogParams(), message);
};
```

This global function pulls the catalog name, API name, and the method to show in the log itself, making it easier to understand each log and what it is connected to.

### Environment Flexibility

```javascript
const envConfigs = {
  test: {
    hostname: "{apiconnect_hostname}",
    key: "value",
  },
  production: {
    hostname: "{apiconnect_hostname}",
    key: "value",
  },
};

const getEnv = () => {
  const hostname = apim.getvariable("api.endpoint.hostname");
  const envs = Object.keys(envConfigs).filter(
    (env) => hostname === envConfigs[env].hostname
  );

  if (!envs.length) {
    alert(`Hostname: " ${hostname}" does not exist in env configs`);
    throw `Hostname: " ${hostname}" does not exist in env configs`;
  }

  // Environment is "production" by default
  const { environment = "production" } = normalizeHeaders(
    apim.getvariable("request.headers")
  );
  // If the environment is not valid, use the first one
  const env = envs.includes(environment) ? environment : envs[0];
  return env;
};

const getEnvVariable = (key) => {
  const env = getEnv();

  if (envConfigs[env][key] === undefined) {
    alert(`Key: " ${key}" does not exist in env: " ${env}"`);
    throw `Key: " ${key}" does not exist in env: " ${env}"`;
  }

  return envConfigs[env][key];
};
```

These global functions allow you to control your code using a config and keeping the same code between environments. Using the `getEnvVariable()` will pull the right environment and use the parameters from the mentioned environments.

## References

- [DataPower GatewayScript APIs](https://www.ibm.com/docs/en/datapower-gateway/10.5.0?topic=gatewayscript-apis)
- [API Connect GatewayScript Code Examples](https://www.ibm.com/docs/en/api-connect/10.0.5.x_lts?topic=gatewayscript-code-examples)
- [Using Context Variables in GatewayScript and XSLT Policies](https://www.ibm.com/docs/en/api-connect/10.0.5.x_lts?topic=aplc-using-context-variables-in-gatewayscript-xslt-policies-datapower-api-gateway)
