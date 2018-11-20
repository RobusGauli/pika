/**
 * Pika -- Intuitive HTTP client library for browser/node.
 *
 * Copyright © 2015-2016 Kriasoft, LLC. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import axios from 'axios';

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

  // global handlers for http errors code
  const globalErrorHandlers = {};
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
    // common http status codes
    status: {
      // success codes 2XX
      OK: 200,
      CREATED: 201,
      ACCEPTED: 202,
      NO_CONTENT: 204,
      // client error codes 4XX
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      METHOD_NOT_ALLOWED: 405,
      REQUEST_TIMEOUT: 408,
      // server error codes 5XX,
      INTERNAL_SERVER_ERROR: 500,
      NOT_IMPLEMENTED: 501,
      BAD_GATEWAY: 502,
      SERVICE_UNABAILABLE: 503,
      GATEWAY_TIMEOUT: 504
    },
    // withBaseURL public builder method for global base url
    // it sets the base url parameters in global config
    // and returns the current instance
    // to be chainable.
    baseURL: function (baseURL) {

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
    header: function (key, val) {

      if (type(key) !== 'string' || type(val) !== 'string') {
        throw new TypeError(
          `Invalid Header for key: ${key} and value: ${val}.`
        );
      }
      setGlobalHeaders(key, val);

      return this;
    },
    auth: function (authToken) {
      let _type;
      if ((_type = type(authToken)) !== 'string') {
        throw new TypeError(
          `Invalid Authorization token.Must be of type 'string' but found ${_type}.`
        );
      }
      setGlobalHeaders('Authorization', authToken);

      return this;
    },

    headers: function (object) {
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
    method: function (method) {
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
    error: function (errorCode, cb) {
      if (
        type(errorCode) !== 'number' ||
        type(cb) !== 'function'
      ) {
        throw new TypeError(`Invalid argument to error handler for error code ${errorCode}.`);
      }

      globalErrorHandlers[errorCode] = cb;

      return this;
    },
    // syntatic sugar over error method for not found error
    notFound: function (cb) {
      return this.error(this.status.NOT_FOUND, cb);
    },
    badRequest: function (cb) {
      return this.error(this.status.BAD_REQUEST, cb);
    },
    unauthorized: function (cb) {
      return this.error(this.status.UNAUTHORIZED, cb);
    },
    forbiddenRequest: function (cb) {
      return this.error(this.status.FORBIDDEN, cb);
    },
    methodNotAllowed: function (cb) {
      return this.error(this.status.METHOD_NOT_ALLOWED, cb);
    },
    create: function () {

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
            headers: {},
            errorHandlers: {}
          };
        }

        methodFactory(method) {
          return (function (path) {
            // sets the method name and url of the requst context
            const { config } = this.requestContext();

            config.url = path;
            config.method = method;

            return this;
          }).bind(this);
        }

        body(body) {
          if (
            type(body) === 'undefined' || type(body) === 'null'
          ) {
            throw new TypeError('Invalid body. Cannot be null or undefined.');
          }
          const { config } = this.requestContext();
          config.body = body;

          return this;
        }

        async json() {
          const response = await this._makeRequest();

          return response;
        }

        error(errorCode, cb) {
          if (
            type(errorCode) !== 'number' ||
            type(cb) !== 'function'
          ) {
            throw new TypeError(`Invalid argument to error handler for error code ${errorCode}.`);
          }

          // attach it to local request context
          const { errorHandlers } = this.requestContext();
          errorHandlers[errorCode] = cb;

          return this;
        }
        // syntatic sugar over error method for not found error
        notFound(cb) {
          return this.error(globalInstance.status.NOT_FOUND, cb);
        }

        badRequest(cb) {
          return this.error(globalInstance.status.BAD_REQUEST, cb);
        }

        unauthorized(cb) {
          return this.error(globalInstance.status.UNAUTHORIZED, cb);
        }

        forbiddenRequest(cb) {
          return this.error(globalInstance.status.FORBIDDEN, cb);
        }

        methodNotAllowed(cb) {
          return this.error(globalInstance.status.METHOD_NOT_ALLOWED, cb);
        }

        async _makeRequest() {
          // make the request
          const config = this._prepareAxiosConfig();
          let response;
          try {

            response = await axios(config);

          } catch (error) {
            // handle the error generated during request
            return this._handleError(error);
          }
          // clear the requestContext
          this._clearRequestContext();

          return response.data;
        }

        _handleError(error) {
          // check for globals
          const { status } = error.response;
          const statusCode = status.toString();
          if (globalErrorHandlers[statusCode]) {
            return globalErrorHandlers[statusCode](error, this);
          }
          // check for locals
          const requestCtx = this.requestContext();
          const { errorHandlers } = requestCtx;

          if (errorHandlers[statusCode]) {
            return errorHandlers[statusCode](error, this);
          }
          // else throw error to the caller
          throw error;
        }

        _clearRequestContext() {
          this.requestCtx = null;
        }

        _prepareAxiosConfig() {
          // merge the headers
          const localRequestContext = this.requestContext();

          const headers = {
            ...globalHeaders,
            ...localRequestContext.headers
          };

          const config = {
            ...globalConfig,
            ...localRequestContext.config,
            headers
          };

          return config;
        }

      }();

    }
  };

  return globalInstance;
}
export default PikaFactory();
