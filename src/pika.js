import axios from 'axios';

const toString = Object.prototype.toString;
const hasOwnProp = Object.prototype.hasOwnProperty;

function isFactory(match) {
  return function(val) {
    return toString.call(val) === match;
  };
}

// check to see if val is array
const is = {
  array: isFactory('[object Array]'),
  object: isFactory('[object Object]'),
  string: isFactory('[object String]'),
  number: isFactory('[object Number]'),
  function: isFactory('[object Function]')
};

// forEach function for iterable
function forEach(obj, fn) {
  if (obj === null || typeof obj === 'undefined' || typeof fn !== 'function') {
    return;
  }

  // make it iterable if it is not
  if (typeof obj !== 'object') {
    obj = [obj];
  }

  // for array
  if (is.array(obj)) {
    for (let i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }

    return;
  }

  // for object
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      fn.call(null, obj[key], key, obj);
    }
  }
}

// merge without mutating the original reference
function deepMerge(...args) {
  const result = {};

  args.forEach(arg => {
    forEach(arg, (val, key) => {
      if (typeof val === 'object' && result[key] === 'object') {
        result[key] = deepMerge(result[key], val);
      } else if (typeof val === 'object') {
        result[key] = deepMerge({}, val);
      } else {
        result[key] = val;
      }
    });
  });

  return result;
}

// This function is directly taken from Axios since it is not exported from the axios library
// :)

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  let config = {};

  forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    }
  });

  forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {
    if (is.object(config2[prop])) {
      config[prop] = deepMerge(config1[prop], config2[prop]);
    } else if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (is.object(config1[prop])) {
      config[prop] = deepMerge(config1[prop]);
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  forEach(
    [
      'baseURL',
      'transformRequest',
      'transformResponse',
      'paramsSerializer',
      'timeout',
      'withCredentials',
      'adapter',
      'responseType',
      'xsrfCookieName',
      'xsrfHeaderName',
      'onUploadProgress',
      'onDownloadProgress',
      'maxContentLength',
      'validateStatus',
      'maxRedirects',
      'httpAgent',
      'httpsAgent',
      'cancelToken',
      'socketPath'
    ],
    function defaultToConfig2(prop) {
      if (typeof config2[prop] !== 'undefined') {
        config[prop] = config2[prop];
      } else if (typeof config1[prop] !== 'undefined') {
        config[prop] = config1[prop];
      }
    }
  );

  return config;
}

// Subclass of axios.Axios to return axios instance
class Pikachu extends axios.Axios {
  /**
   *
   * @param {object} param
   */
  constructor({
    globalConfig,
    axiosConfig,
    errorStatusCallbacks,
    errorCodeCallbacks
  }) {
    // merge the global pika config and axios.defaults config
    let combinedConfig = mergeConfig(axios.defaults, globalConfig);
    // merge the config to make it compatible to axios.create
    super(mergeConfig(combinedConfig, axiosConfig));

    // initialize the response interceptors if error is provided
    this._initErrorStatusInterceptors(errorStatusCallbacks);
    // initialize interceptors for error code callbacks
    this._initErrorCodeInterceptors(errorCodeCallbacks);
  }

  _initErrorCodeInterceptors(errorCodeCallbacks) {
    if (!Object.keys(errorCodeCallbacks).length) {
      return;
    }
    this.interceptors.response.use(undefined, err => {
      return err.response ||
        !is.string(err.code) ||
        !hasOwnProp.call(errorCodeCallbacks, err.code)
        ? Promise.reject(err)
        : errorCodeCallbacks[err.code].call(null, err);
    });
  }

  _initErrorStatusInterceptors(error) {
    if (!Object.keys(error).length) {
      return;
    }
    this.interceptors.response.use(undefined, err => {
      return !err.response ||
        !hasOwnProp.call(error, err.response.status)
        ? Promise.reject(error)
        : error[err.response.status].call(null, err);
    });
  }
}

const throwIfNotFactory = function(predicate, type) {
  return function(obj) {
    let shouldThrow = false;
    let keys = [];
    forEach(obj, (val, key) => {
      if (!predicate(val)) {
        shouldThrow = true;
        keys.push(key);
      }
    });

    if (shouldThrow) {
      throw new TypeError(
        `Invalid argument. ${keys.join(' ,')} must be of type ${type}.`
      );
    }
  };
};

const throwIfNot = {
  string: throwIfNotFactory(is.string, 'string'),
  number: throwIfNotFactory(is.number, 'number'),
  function: throwIfNotFactory(is.function, 'function')
};

function pika() {
  const AUTHORIZATION_HEADER = 'Authorization';

  const globalConfig = {
    headers: {}
  };

  // map of status code and callback that is later registered in interceptors
  const errorStatusCallbacks = {};

  // map of error code and callback that is registerd in interceptors
  // these error codes are not generated by remote server
  const errorCodeCallbacks = {};

  return {
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
      TIMEOUT: 'ECONNABORTED',
      ECONNREFUSED: 'ECONNREFUSED'
    },
    baseURL: function(baseURL) {
      throwIfNot.string({ baseURL });
      globalConfig.baseURL = baseURL;

      return this;
    },
    timeout: function(timeout) {
      throwIfNot.number({ timeout });
      globalConfig.timeout = timeout;

      return this;
    },
    method: function(method) {
      throwIfNot.string({ method });
      globalConfig.method = method;

      return this;
    },
    header: function(key, value) {
      throwIfNot.string({ key, value });
      globalConfig.headers[key] = value;

      return this;
    },
    authorization: function(auth) {
      throwIfNot.string({ auth });

      return this.header(AUTHORIZATION_HEADER, auth);
    },
    error: function(errorCode, cb) {
      // register the error code
      throwIfNot.number(errorCode);
      throwIfNot.function(cb);
      errorStatusCallbacks[errorCode] = cb;

      return this;
    },
    // syntactic sugar for invalid status codes
    badRequest: function(cb) {
      return this.error(this.status.BAD_REQUEST, cb);
    },
    unauthorized: function(cb) {
      return this.error(this.status.UNAUTHORIZED, cb);
    },
    forbidden: function(cb) {
      return this.error(this.status.FORBIDDEN, cb);
    },
    notFound: function(cb) {
      return this.error(this.status.NOT_FOUND, cb);
    },
    methodNotAllowed: function(cb) {
      return this.error(this.status.METHOD_NOT_ALLOWED, cb);
    },
    requestTimeout: function(cb) {
      return this.error(this.status.REQUEST_TIMEOUT, cb);
    },
    internalServerError: function(cb) {
      return this.error(this.status.INTERNAL_SERVER_ERROR, cb);
    },
    notImplemented: function(cb) {
      return this.error(this.status.NOT_IMPLEMENTED, cb);
    },
    onConnectionRefused: function(cb) {
      throwIfNot.function(cb);
      errorCodeCallbacks[this.errorCode.ECONNREFUSED] = cb;

      return this;
    },
    onTimeout: function(cb) {
      throwIfNot.function(cb);
      errorCodeCallbacks[this.errorCode.TIMEOUT] = cb;
      
      return this;
    },
    create: function(config = {}) {
      // returns the new instance of Axios
      return new Pikachu({
        globalConfig,
        axiosConfig: config,
        errorCodeCallbacks,
        errorStatusCallbacks
      });
    }
  };
}
export default pika();
