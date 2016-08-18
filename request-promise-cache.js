
// promisified version of request with cache

var request = require('request');
var cache = require('nano-cache');
var LOADING_CACHE_KEY_SUFFIX = '____loading____';

function promisifyAndCachifyRequest (r, options) {
  r = r || request.defaults(options || {});

  return function(params) {
    var promise = new Promise(function(resolve, reject) {

      var fresh = params.fresh;
      var cacheKey = params.cacheKey;
      var cacheTTL = params.cacheTTL;
      var cacheLimit = params.cacheLimit;

      delete params.fresh;
      delete params.cacheKey;
      delete params.cacheTTL;
      delete params.cacheLimit;


      if ((fresh || (params.qs && params.qs._)) && cacheKey) {
        cache.del(cacheKey);
        cache.del(cacheKey + LOADING_CACHE_KEY_SUFFIX);
      }

      if(cacheKey) {
        var hit = cache.get(cacheKey);
        if (hit) {
          resolve(hit);
          return;
        }
        var loading = cache.get(cacheKey + LOADING_CACHE_KEY_SUFFIX);
        if (loading) {
          loading.promise.then(resolve, reject);
          return;
        }

        var previousResolve = resolve;
        var previousReject = reject;
        var newPromise = new Promise(function(rslv, rjct) {
          resolve = function(ret) {
            previousResolve(ret);
            rslv(ret);
          };
          reject = function(ret) {
            previousReject(ret);
            rjct(ret);
          };
        });
        cache.set(cacheKey + LOADING_CACHE_KEY_SUFFIX, {promise: newPromise}, {ttl: cacheTTL, limit: cacheLimit});
      }

      r(params, function(error, response, body) {
        var ret = {error: error, response: response, body: body};

        if (error || response.statusCode != 200) {
          reject(ret);
        } else {
          cacheKey && cache.set(cacheKey, ret, {ttl: cacheTTL, limit: cacheLimit});
          resolve(ret);
        }

        cacheKey && cache.del(cacheKey + LOADING_CACHE_KEY_SUFFIX);
      });
    });

    return promise;
  };
}

function defaults (defaults) {
  var r = request.defaults(defaults || {});
  return promisifyAndCachifyRequest(r);
}
var requestPromiseCache = promisifyAndCachifyRequest();

// original request()
requestPromiseCache.original = request;

// same as the original.defaults, but promisified
requestPromiseCache.defaults = defaults;

// ref to the nano cache instance
requestPromiseCache.cache = cache;

module.exports = requestPromiseCache;
