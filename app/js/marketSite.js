/**
 * This object wrap the contract to be used by de dapp.
 * 
 * @param _contract Contract object created from web3.
 * @param _ipfs IPFS client.
 * @param _publishCost Cost of create a publication.
 * @param _errorHandler Where logs errors generated from the contract calls.
 */
function MarketSite(_contract, _ipfs, _publishCost, _errorHandler) {
    this.self = this;
    this.ipfs = _ipfs;
    this.publishCost = _publishCost;
    this.contract = _contract;
    this.eventsHandlers={};

    // public constants
    this.Events = {
        PublishedItem: "PublishedItem",
        ValueChanged: "ValueChanged",
        ItemSold: "ItemSold",
        ItemPaid: "ItemPaid",
        OwnershipTransferred: "OwnershipTransferred",
        PublicationCost: "PublicationCost"
    };

    this.State = {
        Published : 0,
        Offered : 1,
        Finished : 2,
        Payded : 3
    };

    // install global event handler for the contract
    this.contract.events.allEvents((err, event) => {
        if (err) {
            console.log(err);
            return;
        }
        // this object keep a copy for the publication cost
        if (event.event === "PublicationCost") {
            this.publishCost = event.returnValues.publicationCost;
        }

        let handlers = this.eventsHandlers[event.event];
        if (handlers) {
            for(let pos in handlers) {
                try {
                    handlers[pos](event.event, event.returnValues);
                }
                catch(e) {
                    console.log("Fail invoking handler: " + e);
                }
            }
        }
    });

    /**
     * Add an event handler for the given event.
     * 
     * @param {string} eventName Event name for the call back 
     * @param {function} cb Callback function
     */
    this.addEventHandler = function(eventName, cb) {
        let handlers = this.eventsHandlers[eventName];
        if (handlers) {
            handlers.push(cb);
        }
        else {
            this.eventsHandlers[eventName] = [cb];
        }
    };

    /**
     * Clear all the event handlers for the event.
     * 
     * @param {string} eventName Event name
     */
    this.clearEventHandler = function(eventName) {
        delete this.eventsHandlers[eventName];
    };

    /**
     * Clear all events handlers.
     */
    this.clearAllEventHandlers = function() {
        this.eventsHandlers={};
    };

    /**
     * Return the item count.
     * 
     * @returns a Promise with a number.
     */
    this.itemsCount = function() {
        return this.contract.methods.itemsCount()
            .call()
            .catch(_errorHandler);
    };

    /**
     * Return the information about a publication.
     * 
     * @param {number} itemId Publication number.
     * @returns a Promise with the publication info.
     */
    this.retrieveItem = function(itemId) {
        return this.contract.methods.getItem(itemId).call();
    }

    /**
     * Retrieve a collection of items.  Have params to allow paginate the data retrieval.
     * 
     * @param {number} from Initial item id (and nexts will go descendents)
     * @param {number} count Results count.
     * @param {function} predicate Filter function for the items.
     * @returns a Promise with an array of items.
     */
    this.retrieveItems = function(from, count, predicate) {
        return new Promise((resolve, reject) => {
            let results = [];
            for (; count > 0 && from > 0; from--) {
                results.push(this.contract.methods.getItem(from).call());
            }
            Promise.all(results)
                .then(v => {
                    let filtered = v.filter(predicate);
                    if (from > 0 && count > filtered.length ) {
                        this.retrieveItems(from - 1, count - filtered.length, predicate)
                            .then(res => resolve( filtered.concat(res)));
                    }
                    else {
                        resolve(filtered);
                    }
                })
                .catch(_errorHandler);
        });
    };

    /**
     * Retrieve all items in the contract.
     * @param {function} predicate Optional predicate to apply as a filter
     * @returns a Promise with un array of items.
     */
    this.retrieveAllItems = function(predicate) {
        const pred = predicate || (() => true);
        return new Promise((resolve, reject) => {
            this.itemsCount()
                .then(v => {
                    this.retrieveItems(v, v, pred)
                        .then(res => resolve(res))
                        .catch(_errorHandler)
            })
        });
    };

    /**
     * Create a new publication.
     * 
     * @param {string} objData IPFS file hash with the publication data.
     * @param {number} initialValue Initial sell value.
     * @param {number} maxValue Max sell value.
     * @returns a Promise with the transaction.
     */
    this.publishItem = function(objData, initialValue, maxValue) {
        if (maxValue < initialValue) {
            return Promise.reject("The initial value must be less than max value");
        }
        return getUserAddress()
            .then(address => this.ipfs.addJSON(objData)
                .then(hash => 
                    this.contract.methods.publishItem(hash, initialValue, maxValue)
                        .send({from: address, value: this.publishCost }))
            );
    };

    /**
     * Create an offer (like a bet) over an item.
     * 
     * @param {number} itemId Item id.
     * @param {number} value Mount to bet for the item.
     * @param {number} maxValue Max mount to bet.  This allow automatic bets.
     * @returns a Promise with the transaction info.
     */
    this.createOffer = function(itemId, value, maxValue) {
        return getUserAddress()
            .then(address => {
                return this.contract.methods.offerItem(itemId, value)
                    .send({from: address, value: maxValue});
            });
    };

    /**
     * Do a claim over a finished publication.
     * 
     * @param {number} itemId Publication id.
     * @returns a Promise with the transaction info.
     */
    this.claim = function(itemId) {
        return getUserAddress()
            .then(address => {
                return this.contract.methods.claimFounds(itemId)
                    .send({from: address});
            });
    };

    /**
     * Return the current owner of the contract.
     * 
     * @returns a Promise with the owner address.
     */
    this.owner = function() {
        return this.contract.methods.owner().call();
    };

    /**
     * Change the ownership for the contract.
     * 
     * @param {string} newAddress Address for the new owner.
     * @returns a Promise with the transaction.
     */
    this.transferOwnership = function(newAddress) {
        return getUserAddress()
            .then(address => {
                return this.contract.methods.transferOwnership(newAddress)
                    .send({from: address});
        });
    };

    /**
     * Change the publication cost for a product.
     * 
     * @param {number} newCost The new value for publication cost.
     * @returns a Promise with the transaction.
     */
    this.setPublicationCost = function(newCost) {
        return getUserAddress()
            .then(address => {
                return this.contract.methods.setPublicationCost(newCost)
                    .send({from: address});
        });
    }
}
