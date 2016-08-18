# request-promise-cache
Request promise with cache

## Dependencies

* [request](https://github.com/request/request)
* [nano-cache](https://github.com/akhoury/nano-cache) 

Uses the native javascript [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) introduced in Node.js 0.12+


## Usage

```javascript
var request = require('request-promise-cache');

var url = 'http://google.com';
request({
    url: url,
    cacheKey: url,
    cacheTTL: 3600,
    cacheLimit: 12
  })
  .then(function(ret) {
    console.log(ret); // {body: body, response: response, error: error}
  })
  .catch(function(ret) {
    console.error(ret); // {response: response, error: error}
  });
```

## Options

All of the original [request library's options](https://github.com/request/request#requestoptions-callback), plus the following:

* `cacheKey: string`, the cache key use, typically, it's just the URL, maybe add the query string
* `cacheTTL: milliseconds`, automatically expire a cache entry after Y number of milliseconds, if used with `cacheLimit`, whichever comes first will take precedence
* `cacheLimit: integer`, automatically expire a cache entry after X amount of reads, if used with `cacheTTL`, whichever comes first will take precedence
* `fresh: true/false`, delete the cached entry and get a fresh one
* `_: 123456789 /* anything truthy */`, same as `fresh`, _(for the jquery users)_

## Asynchronous calls with the same `cacheKey`

If you make 2 or more requests with the same `cacheKey` at the _same_ time, and of course, the response comes back within the `cacheTTL` of the first request, __only__ 1 request will go out, the rest will wait for it and resolve at the _same_ time.

## Extras

On the returned `request` object, you can:

* `request.original` access the original request function,
* `request.defaults()` another request object function generator, which is used exactly like the original [`request.defaults`](https://github.com/request/request#requestdefaultsoptions) but this one will return a __promisified__ request with the __caching__.
* `request.cache` is the cache instance using, which is a [`nano-cache`](https://github.com/akhoury/nano-cache) instance, say you need to `request.cache.clear()`

## License

MIT
