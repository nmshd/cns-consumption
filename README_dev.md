# Consumption Library developer information

## Development Guide

## Error Solving Guide

### Build / Tests resolve into strange errors

Like:

-   Doesn't build at all
-   Module not found
-   Something is undefined which should not be undefined (e.g. "TypeError: Cannot read property 'from_base64' of undefined")

Solutions:

-   Check if you have got absolute "src/" or "/" includes somewhere and change them to relative ones ("../")
-   Check if you have a cyclic reference somewhere (sometimes quite hard to find). In general, no class should include something from the root's index.ts export (looks like import \* from "../../")
-   Check if you have "/dist" as suffix for includes (e.g. "@nmshd/crypto/dist"). This usually works fine within NodeJS, however Webpack (Browser Build) has some issues therein, resulting e.g. in the crypto lib being copied into the transport lib. It should be fixed, but you never know...

### Something about duplicate private properties

Do not use abstract classes.

### Serialization/Deserialization won't work

Or deserialize-/fromUnknown won't find your class.

-   Check if all (parent) classes up to Serializable(-Async) inclulde a @schema declaration with a type
-   You might have several different Serializable(-Async) instances up- and running. This usually happens if ts-serval/crypto/transport are not correctly imported.
