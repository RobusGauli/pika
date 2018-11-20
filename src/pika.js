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
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'number' && value.toString() === 'NaN') {
    return 'NaN';
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
      [key]: value
    };
  }
  // sets the global headers
  function setGlobalHeaders(key, value) {
    globalHeaders = {
      ...globalHeaders,
      [key]: value
    };
  }

  const globalInstance = {
    // common http methods
    methods: {
      GET: 'get',
      PUT: 'put',
      POST: 'post',
      DELETE: 'delete',
      PATCH: 'patch',
      OPTIONS: 'options'
    },
    // withBaseURL public builder method for global base url
    // it sets the base url parameters in global config
    // and returns the current instance
    // to be chainable.
    baseURL: function(baseURL) {
      
      let _type;
      if ((_type = type(baseURL)) !== 'string') {
        throw new TypeError(
          `Invalid Base URL.Must be of type "string" but found ${_type}.`
        );
      }
      setGlobalConfig('baseURL', baseURL);

      return this;
    },
    // helper method to peek at the config
    getGlobalConfig() {
      return globalConfig;
    },
    // helper method. later wil be removed.
    getGlobalHeaders() {
      return globalHeaders;
    },
    // builder method for global timeout.
    // chainable
    timeout(timeout) {
      // this sets the global timeout
      let _type;
      if ((_type = type(timeout)) !== 'number') {
        throw new TypeError(
          `Invalid timeout.Must be of type "number" but found ${_type}.`
        );
      }
      setGlobalConfig('timeout', timeout);

      return this;
    },
    /**
     * Builder method that sets the global header given a key and value.
     * It returns the current instance for chaining.
     *
     * @param {string} key
     * @param {string} val
     *
     * @returns {object} this
     */
    header: function(key, val) {
      if (type(key) !== 'string' || type(val) !== 'string') {
        throw new TypeError(
          `Invalid Header for key: ${key} and value: ${val}.`
        );
      }
      setGlobalHeaders(key, val);

      return this;
    },
    auth: function(authToken) {
      let _type;
      if ((_type = type(authToken)) !== 'string') {
        throw new TypeError(
          `Invalid Authorization token.Must be of type 'string' but found ${_type}.`
        );
      }
      setGlobalHeaders('Authorization', authToken);

      return this;
    },
    
    headers: function(object) {
      let _type;
      if ((_type = type(object)) !== 'object') {
        throw new TypeError(
          `Invalid Headers.Must be of type 'object' but found ${_type}.`
        );
      }
      let obj = { ...object };
      Object.keys(obj).forEach(key => {
        let val = obj[key];
        setGlobalHeaders(key, val);
      });

      return this;
    },
    method: function(method) {
      let _type;
      if ((_type = type(method) !== 'string')) {
        throw new TypeError(
          `Invalid method name.Must be of type "string" but found ${_type}.`
        );
      }
      
      if (Object.values(this.methods).indexOf(method.toLowerCase()) === -1) {
        throw new Error(
          `Invalid HTTP methods.Valid methods are ${Object.values(
            this.methods
          ).join(', ')}`
        );
      }
      setGlobalConfig('method', method.toLowerCase());

      return this;
    },
    create: function() {
      
      return new class {
        constructor() {
          // this request represents child request instance
          // this will override the configuration and headers of parent request
          // it's value is set to null after request termination    
          this.requestCtx = null;
          
          // http methods creation
          this.get = this.methodFactory(globalInstance.methods.GET);
          this.put = this.methodFactory(globalInstance.methods.PUT);
          this.post = this.methodFactory(globalInstance.methods.POST);
          this.patch = this.methodFactory(globalInstance.methods.PATCH);
          this.delete = this.methodFactory(globalInstance.methods.DELETE);
          this.options = this.methodFactory(globalInstance.methods.OPTIONS);
        }
        
        requestContext() {
          if (this.requestCtx) {
            return this.requestCtx;
          }

          return this.requestCtx = this.createRequestCtx();
        }

        createRequestCtx() {
          return {
            config: {},
            headers: {}
          };
        }
        
        methodFactory(method) {
          return (function(path) {
            // sets the method name and url of the requst context
            const { config } = this.requestContext();
            
            config.url = path;
            config.method = method;

            return this;
          }).bind(this);
        }
        
      }();

    }
  };

  return globalInstance;
}
export default PikaFactory();
