# Final Proyect: Market site

## About this site

This site is for buying and selling products (like Mercado Libre or Ebay) based on smart contracts. In this site the items for sale will be auctioned.  They don't have a fixed sale amount. When the user made a bid, he must gives a maximum value to allow automatic bids (as can be done on some auction sites).

Also, all the items for sale have a time out and a maximum sale price.  Bidding ends when the highest bidder reaches the maximum price of the publication or when the bidding time runs out.

## Use case descriptions

* Smart Contract deploy.  The contract owner must define two values:  the publication fee and the timeout duration.  For example, a contract could have a fee of 10 wei and a duration of 7 days.

* A user registers an item for sale (e.g. a chair).  The user must indicate a base price, a desirable price and a description of the item.  This description is stored as a JSON file in an IPFS service.

The publication fee is transferred to the contract owner.

+ Receive a bid for an auction item. For each bid, the buyer must indicate his current bid value and the maximum value he wishes to pay.  The latter value is used for automatic bidding.

One of the following situations may apply:
  * The value of the offer price (and the value of the maximum price) is below the current offer price.  In this case, it is ignored and the payment is refunded to the user.
  * The value of the bid price is higher than the current bid price, and lower than the actual maximum price. In addition, the maximum price to be paid is lower than the actual maximum price offered.  In this case, the actual payment for the product is updated to the maximum value and the payment is returned to the user. For example, a product has a current bid price of 20 and a maximum price to pay of 100. If another buyer bids 40 and the maximum bid value is 80, with these values he will not win the bid as he will not reach the value of 100. In addition, this will raise the current bid on the product to 80, keeping the previous user as the winner.
  * The value of the maximum price is higher than the existing maximum price.  The buyer wins the bid and the payment made by the previous buyer is refunded. The bid price of the product is also updated.

In all previous situations, if the current bid price of the product is greater than or equal to the desirable price entered by the product owner when creating the listing, the listing ends.  The winner of the auction is the buyer who placed the highest bid.

* An external service is used to call the contract and check the end date of each active publication.  A cron or Gelato can be used for this purpose. This is outside the scope of the current development.

* The agreement between the buyer and the seller to deliver the product is outside the scope of this application.

* The publication ends when the time runs out or the bid reaches the defined minimum price.  The seller must then decide to collect the bid. The bid amount is then transferred to the seller's account. If there is a difference to the maximum value entered by the buyer, this will be refunded to the buyer.

* The smart contract's owner may change the publication fee.  This fee is associated with the process of creating the publication.  This value will be transferred to the owner's account.

* After a certain period of time, finished publications must be deleted in order to free up space.  This functionality is not covered by this development.

# Public Site URL

The DAPP is hosted in this URL: https://geruiz.github.io/

# Screencast link

A screencast video is available at https://youtu.be/CgGyHLcedZI

# Public Ethereum address for certification

0xC257e96F122d9999855c1A6e24bb0301eAA11Aea

# Local run

## Dependencies

To local compilation, need NodeJS (>=14) installed.  Download from http://nodejs.org

Next, need truffle installed as global dependency.
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
Also was running with Truffle using the development network that provides.

### Using Ganache as develop network

  + Start Ganache running the executable file.

  + Deploy the contract in Ganache using the next command:
  ```
  truffle deploy --reset --network ganache
  ```

### Using Truffle as develop network

  + Start Truffle in develop mode:
  ```
  truffle developt
  ```

  + In the console that Truffle provides, deploy the contracts:
  ```
  deploy --reset
  ```

### Start de develop server

The contract migration process will generate the file `/js/contract_constant.js` with contract ABI and contract address.
This file is used in the web site to allow interaction with the contract.

Having one of the previous stages ready, only is need start the frontend web app executing:

```
npm start
```

The server listen the port 8000.

Open a web browser with Metamask installed and navigate at page http://127.0.0.1:8000. Configure Metamask to use the local network.

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
