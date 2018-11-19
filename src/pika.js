/**
 * Pika -- Intuitive HTTP client library for browser/node.
 *
 * Copyright © 2015-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

 /**
 * Returns the actual type of value.
 * 
 * @param {any} value 
 * @returns {string} 
 */
function type(value) {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }

  if (typeof value === 'number' && value.toString() === 'NaN') {
    return 'NaN'
  }

  return typeof value;
}

/**
 * PikaFactory exposes the global object for http request context.
 * 
 */
function PikaFactory() {
  // global headers  is share across all the instances of http request
  // this headers can be then overidden by child request
  let globalHeaders = {};
  // global parameters is share across all instances of http request
  // this parameters can be overidden by child request
  let globalConfig = {};
  
  // sets the global parameters
  function setGlobalConfig(key, value) {
    globalConfig = {
      ...globalConfig,
      [key]: value,
    }
  }
  // set the global headers
  function setGlobalHeaders(key, value) {
    globalHeaders = {
      ...globalHeaders,
      [key]: value,
    }
  }
  
  return {
    methods: {
      GET: 'get',
      PUT: 'put',
      POST: 'post',
      DELETE: 'delete',
      PATCH: 'patch',
      OPTIONS: 'options'
    },
    withBaseURL: function(baseURL) {
     let _type;
     if ((_type = type(baseURL)) !== 'string') {
       throw new TypeError(`Invalid Base URL.Must be of type "string" but found ${_type}.`);
     }
     setGlobalConfig('baseURL', baseURL);
     return this; 
    },
    getGlobalConfig() {
      return globalConfig;
    },
    getGlobalHeaders() {
      return globalHeaders;
    },
    withTimeout(timeout) {
      // this sets the global timeout
      let _type;
      if ((_type = type(timeout)) !== 'number') {
        throw new TypeError(`Invalid timeout.Must be of type "number" but found ${_type}.`)
      }
      setGlobalConfig('timeout', timeout);
      return this;
    },
    withHeader: function(key, val) {
      if(
        type(key) !== 'string' ||
        type(value) !== 'string'
      ) {
        throw new TypeError(`Invalid Header for key: ${key} and value: ${value}.`);
      }
      setGlobalHeaders(key, val);
      return this;
    },
    withAuthorization: function(authToken) {
      let _type;
      if ((_type = type(authToken)) !== 'string') {
        throw new TypeError(`Invalid Authorization token.Must be of type 'string' but found ${_type}.`);
      }
      setGlobalHeaders('Authorization', authToken);
      
      return this;
    },
    // short hand for withAuthorization
    withAuth: function(authToken) {
      return this.withAuthorization(authToken);
    },
    withHeaders: function(object) {
      let _type;
      if ((_type = type(object)) !== 'object') {
        throw new TypeError(`Invalid Headers.Must be of type 'object' but found ${_type}.`);
      }
      let obj = {...object}
      Object.keys(obj).forEach(key => {
        let val = obj[key];
        setGlobalHeaders(key, val);
      })
      return this;
    },
    withHTTPMethod: function(method) {
      let _type;
      if ((_type) = type(method) !== 'string') {
        throw new TypeError(`Invalid method name.Must be of type "string" but found ${_type}.`);
      }
      
      if (Object.values(this.methods).indexOf(method.toLowerCase() === -1) {
        throw new Error(`Invalid HTTP methods.Valid methods are ${Object.values(this.methods).join(', ')}`)
      }
      setGlobalConfig('method', method.toLowerCase())
      return this;
    }
    
  }
  
}
export default PikaFactory();
