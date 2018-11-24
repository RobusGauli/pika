
import axios from 'axios';

const toString = Object.prototype.toString;

// check to see if val is array
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

// check if the function is object
function isObject(val) {
  return toString.call(val) === '[object Object]';
}

// unversal forEach method
function forEach(obj, fn) {
  if (
    obj === null ||
    typeof obj === 'undefined' ||
    typeof fn !== 'function'
  ) {
    return;
  }
  
  // check if obj is iterable and if it is not
  // make it iterable
  if (typeof obj !== 'object') {
    obj = [obj];
  }
  
  // now if it is array
  if (isArray(obj)) {
    
    for (let i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);    
    }
    
    return;
  } 

  // that means we have the object
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
    if (isObject(config2[prop])) {
      config[prop] = deepMerge(config1[prop], config2[prop]);
    } else if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (isObject(config1[prop])) {
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

function pika() {
  
  const AUTHORIZATION_HEADER = 'Authorization';
  const globalConfig = {
    headers: {
    },
    auth: {},
    proxy: {}
  };

  return {
    baseURL: function(baseURL) {
      globalConfig.baseURL = baseURL;
      
return this;
    },
    method: function(method) {
      globalConfig.method = method;
      
return this;
    },
    header: function(key, value) {
      globalConfig.headers[key] = value;
      
return this;
    },
    authorization: function(auth) {
      return this.header(AUTHORIZATION_HEADER, auth);
    },
    create: function(config = {}) {
      return new Pikachu(globalConfig, config);
    }
  };
}
export default pika();

