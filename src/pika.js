
import axios from 'axios';

const toString = Object.prototype.toString;

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
  number: isFactory('[object Number]')
};

// forEach function for iterable
function forEach(obj, fn) {
  if (
    obj === null ||
    typeof obj === 'undefined' ||
    typeof fn !== 'function'
  ) {
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
      if (
        typeof val === 'object' && result[key] === 'object'
      ) {
        result[key] = deepMerge(result[key], val);
      } else if (
        typeof val === 'object'
      ) {
        result[key] = deepMerge({}, val);
      } else {
        result[key] = val;
      }
    });
  });
  
return result;
}

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

  forEach([
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
    'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
    'socketPath'
  ], function defaultToConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  return config;
};

// Subclass of axios.Axios to return axios instance 
class Pikachu extends axios.Axios {
  constructor(globalConfig, config) {
    // merge the global pika config and axios.defaults config
    let combinedConfig = mergeConfig(axios.defaults, globalConfig);
    // merge the config to make it compatible to axios.create
    super(mergeConfig(combinedConfig, config));
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
      throw new TypeError(`Invalid argument. ${keys.join(' ,')} must be of type ${type}.`); 
    }
  };
};

const throwIfNot = {
  
  string: throwIfNotFactory(is.string, 'string'),
  number: throwIfNotFactory(is.number, 'number')
};

function pika() {
  
  const AUTHORIZATION_HEADER = 'Authorization';

  const globalConfig = {
    headers: {}
  };

  return {
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
    create: function(config = {}) {
      // returns the new instance of Axios
      return new Pikachu(globalConfig, config);
    }
  };
}
export default pika();

