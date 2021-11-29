# Final Proyect: Market site

## About this site

The idea is to build a site for buying and selling products (like Mercado Libre or Ebay) using a smart contract.
This site has this particularity: the items for sale will be auctioned and would not have a fixed sale amount. And when a bid is made, the user must give a maximum value to allow automatic bids (as can be done on some auction sites).
Also, all the items in sell have a time out and a maximum sell mount.  By reaching either one, the publication will end.

## Use case descriptions

* Contract installation.  In this moment, the contract owner define twe values:  the publication cost and the time limit.

* An item is registered for sale (e.g. a chair).  The user must indicate a base price, an achievable price and a description over it.  This description is saved as a JSON file in a IPFS service.
The publication has a cost.  This value is transferred to the contract owner.

+ Receive an offer over an item for sale.  In every offer, the buyer must indicate the actual value and the maximum value to pay.  This last value is used to realize automatic bets.
There are this situations:
  * The value (and the max value) is below the current bid.  So, it is ignored and the payment returned to the user.
  * The value is greater than the current bid, and below the actual maximum. Also, the maximum amount to be paid is below the actual maximum.  In this case, the actual payment for the product is updated to the max value and the payment returned to the user.
  * The last case, the maximum value is greater than the existent maximum.  The user win de bet and the payment made by the previous user is refund.
In all of the offer cases, if the product mount is bigger than the achievable price, the publication finish and the winner is the current buyer.  

* There is an external service (like a cron or Gelato) to verify the finish date of every active publication.  This situation is no covered by this development.

* There is some kind of agreement where the seller indicates that he delivered the product to the buyer.  This use case is not covered by this development.

* Either because a deadline has passed or because of the seller's will, the offer ends and the amount of the current offer will be transferred to the seller. If there is a difference between the maximum bid and the purchase bid, it will be refunded to the buyer.

* The contract owner can change the publication cost.  This cost, associated with the publication creation process, is transfered to the owner address when this happens.

* Sold and payded items need to be deleted to free space.  This use case is not covered at the moment.

# Public Site URL
The DAPP is hosted in this URL: https://geruiz.github.io/

# Screencast link
TODO

# Public Ethereum address for certification
0xC257e96F122d9999855c1A6e24bb0301eAA11Aea

# Local run

## Dependencies
To local compilation, need NodeJS (>=14) installed.  Download from http://nodejs.org

Next, need truffle installed as global.
```
npm install -g truffle
```

At last, install needed dependencies for build, deploy an run.
``` 
npm install
```

## Compile
Compile the contract with:
```
truffle compile
```
or
```
npm run build
```

## Test
The contract test can be executed with:
```
truffle tests
```
or
```
npm test
```

## Local run
This DAPP was developed using Ganache.  Download from here: https://www.trufflesuite.com/ganache and install in your system.

+ Start Ganache running the executable file.

+ Deploy the contract in Ganache using the next command:
```
truffle deploy --reset --network ganache
```

The contract migration process will generate the file `/js/contract_constant.js` with contract ABI and contract address.
This file is used in the web site to allow interaction with the contract.

+ Next start the frontend web app executing:
```
npm start
```

The server listen the port 8000.

Open a web browser with Metamask installed and navigate at page http://127.0.0.1:8000

## Technical considerations
This DAPP uses javascript libraries from CDN services.  You need an Internet connection to allow the browser to download this.
There are:
  - JQuery
  - Bootstrap
  - Web3
  - ipfs-http-client
  - KnockoutJS

To save files in IPFS, the DAPP uses for default the service provided by Infura.  If you want to use Pinata as a provider, you need to replace the wrapper client.  See the function `ipfsPinata()` in the file `js/ipfs.js`.

## Repository structure

This repository has the following structure: 
```
  .
  └── app                          Frontend implementation.
    └── js                         Directory with JavaScript files.
    └── img                        Directory with the default image.
  └── contracts                    Smart constracts source.
  └── migrations                   JS scripts to deploy the contracts.
  └── test                         JS file to test the smart contract.
  .env_sample                      Example for a .env file to deploy the contract in a public network.
  avoiding_common_attacks.md       Documentation relative to avoid common attacks.
  deployed_address.txt             Contract publication address in Ropsten network.
  design_pattern_decisions.md      Documentation about design decisions.
  README.md                        This file.
  package.json                     Proyect dependencies.
  truffle-config.js                Truffle configuration.

```
