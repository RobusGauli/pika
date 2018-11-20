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
  // global timeout handler
  let globalTimeoutHandler = null;

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
      PATCH: 'patch',
      DELETE: 'delete',
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
    errorCode: {
      TIMEOUT: 'ECONNABORTED'
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
    timeoutHandler(cb) {
      let _type;
      if ((_type = type(cb)) !== 'function') {
        throw new TypeError(
          `Invalid timeout handler. Must be of type 'function' but found ${_type}.`
        );
      }

      globalTimeoutHandler = cb;

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
    error: function(errorCode, cb) {
      if (type(errorCode) !== 'number' || type(cb) !== 'function') {
        throw new TypeError(
          `Invalid argument to error handler for error code ${errorCode}.`
        );
      }

      globalErrorHandlers[errorCode] = cb;

      return this;
    },
    // syntatic sugar over error method for not found error
    notFound: function(cb) {
      return this.error(this.status.NOT_FOUND, cb);
    },
    badRequest: function(cb) {
      return this.error(this.status.BAD_REQUEST, cb);
    },
    unauthorized: function(cb) {
      return this.error(this.status.UNAUTHORIZED, cb);
    },
    forbiddenRequest: function(cb) {
      return this.error(this.status.FORBIDDEN, cb);
    },
    methodNotAllowed: function(cb) {
      return this.error(this.status.METHOD_NOT_ALLOWED, cb);
    },
    create: function() {
      return function(path) {
        return new class {
          constructor() {
            // this request represents child request instance
            // this will override the configuration and headers of parent request
            // it's value is set to null after request termination
            this.path = path;
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

            return (this.requestCtx = this.createRequestCtx());
          }

          createRequestCtx() {
            return {
              config: {
                url: this.path
              },
              headers: {},
              errorHandlers: {},
              timeoutHandler: null,
              currentCaller: null
            };
          }

          methodFactory(method) {
            return function(value) {
              // sets the method name and url of the requst context
              const { config } = this.requestContext();
              if (
                value &&
                (method === globalInstance.methods.GET ||
                  method === globalInstance.methods.DELETE) &&
                typeof value === 'string'
              ) {
                config.url = value;
                config.method = method;

                return this;
              }
              if (
                (value && type(value) !== 'undefined') ||
                type(value) !== 'null'
              ) {
                config.data = value;
                config.method = method;

                return this;
              }
              config.method = method;

              return this;
            }.bind(this);
          }

          body(body) {
            if (type(body) === 'undefined' || type(body) === 'null') {
              throw new TypeError('Invalid body. Cannot be null or undefined.');
            }
            const { config } = this.requestContext();
            config.body = body;

            return this;
          }

          async replay() {
            // call the request context
            const requestCtx = this.requestContext();
            if (!requestCtx.currentCaller) {
              throw new Error(
                'Invalid call to replay."replay" can be called after the first request.'
              );
            }
            // call the original request

            return await this[requestCtx.currentCaller]();
          }
          async json() {
            const response = await this._json();

            return response.data;
          }

          // have to create a _json due it's recursive nature
          async _json() {
            // before calling set the current caller into local request context
            this._setCurrentCaller('_json');

            const response = await this._makeRequest();

            return response;
          }

          _setCurrentCaller(caller) {
            const requestCtx = this.requestContext();
            requestCtx.currentCaller = caller;
          }

          timeout(timeout) {
            // this sets the global timeout
            let _type;
            if ((_type = type(timeout)) !== 'number') {
              throw new TypeError(
                `Invalid timeout.Must be of type "number" but found ${_type}.`
              );
            }
            const requestCtx = this.requestContext();
            requestCtx.config.timeout = timeout;

            return this;
          }

          error(errorCode, cb) {
            if (type(errorCode) !== 'number' || type(cb) !== 'function') {
              throw new TypeError(
                `Invalid argument to error handler for error code ${errorCode}.`
              );
            }

            // attach it to local request context
            const requestCtx = this.requestContext();
            requestCtx.errorHandlers[errorCode] = cb;

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

          timeoutHandler(cb) {
            let _type;
            if ((_type = type(cb)) !== 'function') {
              throw new TypeError(
                `Invalid timeout handler. Must be of type 'function' but found ${_type}.`
              );
            }

            const requestCtx = this.requestContext();
            requestCtx.timeoutHandler = cb;

            return this;
          }
          async _makeRequest() {
            // make the request
            const config = this._prepareAxiosConfig();
            let response;
            try {
              response = await axios(config);
            } catch (error) {
              // handle the error generated during request

              response = await this._handleError(error);
            }
            console.log('request context called');
            // clear the requestContext
            this._clearRequestContext();

            return response;
          }

          async _handleError(error) {
            // check for locals
            // check for globals
            const requestCtx = this.requestContext();
            if (error.code && error.code === globalInstance.errorCode.TIMEOUT) {
              // we have a timeout

              // check for the local timeout handler and call if available
              const { timeoutHandler } = requestCtx;
              if (timeoutHandler && typeof timeoutHandler === 'function') {
                return await timeoutHandler(error, this);
              }
              // check for the global handler
              if (
                globalTimeoutHandler &&
                typeof globalTimeoutHandler === 'function'
              ) {
                return await globalTimeoutHandler(error, this);
              }
            }

            if (error.response) {
              const status = error.response.status.toString();

              const { errorHandlers } = requestCtx;
              if (errorHandlers[status]) {
                return await errorHandlers[status](error, this);
              }

              if (globalErrorHandlers[status]) {
                return await globalErrorHandlers[status](error, this);
              }
            }
            // this._clearRequestContext();
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
      };
    }
  };

  return globalInstance;
}
export default PikaFactory();
