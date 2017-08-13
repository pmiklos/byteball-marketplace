# Project setup

The marketplace uses mongodb to store auction data. Install `mongodb` and start it with 

```
bin/mongod
```

Before working with the project, the dependencies has to be fetched first with the following command:

```
npm install
```

This creates the `node_modules` directory with all the dependendent libraries. Updating the libraries with newer versions can be done with `npm update`.

# Switching to testnet

Since the byteball testnet branches are not well maintained and also the headless wallet has no testnet version, we have to do a hack to turn main net to test net by changing the `version` and `alt` constants in byteball core `constants.js`. The obvious drawback of this approach is that every time the byteballcore package is updated with `npm update` the test constants are overwritten with the live ones. So every time an `npm update` or `npm install` is run the following command has to be run as well:

```
npm run testnetify
```

# Running the marketplace

```
node marketplace.js
```