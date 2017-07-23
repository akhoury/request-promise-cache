/*
    promisified version of request with cache support
*/

var request = require('request');
var cache = require('nano-cache');
var P = global.Promise;

if (! P) {
    console.warn('your nodejs version does not natively support global.Promise,'
        + ' you must pass your custom class, i.e. request.use(require("bluebird")); '
        + ' see https://github.com/akhoury/request-promise-cache#other-promise-libraries'
    )
}

function promisifyAndCachifyRequest (r, options) {
    r = r || request.defaults(options || {});
    r._loading = {};
    r._cache = new cache();
    r._cache.on('del', function (key) {
        delete r._loading[key];
    });
    r._cache.on('clear', function () {
        r._loading = {};
    });

    var requestPromiseCache = function(params) {
        var promise = new P(function(resolve, reject) {

            var fresh = params.fresh;
            var cacheKey = params.cacheKey;
            var cacheTTL = params.cacheTTL;
            var cacheLimit = params.cacheLimit;

            delete params.fresh;
            delete params.cacheKey;
            delete params.cacheTTL;
            delete params.cacheLimit;

            if ((fresh || (params.qs && params.qs._)) && cacheKey) {
                r._cache.del(cacheKey);
            }

            if(cacheKey) {
                var hit = r._cache.get(cacheKey);
                if (hit) {
                    hit.__fromCache = true;
                    resolve(hit);
                    return;
                }

                if (r._loading[cacheKey]) {
                    r._loading[cacheKey].promise.done ? r._loading[cacheKey].promise.done(resolve, reject) : r._loading[cacheKey].promise.then(resolve, reject);
                    return;
                }

                var previousResolve = resolve;
                var previousReject = reject;
                var newPromise = new P(function(rslv, rjct) {
                    resolve = function(ret) {
                        previousResolve(ret);
                        rslv(ret);
                    };
                    reject = function(ret) {
                        previousReject(ret);
                        rjct(ret);
                    };
                });

                r._loading[cacheKey] = {promise: newPromise};
            }

            r(params, function(error, response, body) {
                var ret = {error: error, response: response, body: body};

                if (error || response.statusCode != 200) {
                    reject(ret);
                } else {
                    cacheKey && r._cache.set(cacheKey, ret, {ttl: cacheTTL, limit: cacheLimit});
                    resolve(ret);
                }
                delete r._loading[cacheKey];
            });
        });

        return promise;
    };
    
    requestPromiseCache.cache = r._cache;
    return requestPromiseCache;
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

requestPromiseCache.use = function (CustomPromise) {
    P = CustomPromise;
    return requestPromiseCache;
};

module.exports = requestPromiseCache;

