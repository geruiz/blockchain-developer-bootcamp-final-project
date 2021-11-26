function PageViewModel(sellSite) {
    var self = this;
    this.loaded = ko.observable(false);
    this.items = ko.observableArray([]);
    this.actualAddress = ko.observable(web3.currentProvider.selectedAddress || "");

    function retriveIPFSContent(v) {
        sellSite.ipfs.getJSON(v.ipfsHash)
            .then(obj =>
                self.items.push({
                    ipfs: obj,
                    item: v,
                    updated: false
                })
            );
    }

    function clearItemStatus(item) {
        window.setTimeout(() => {
            self.items.replace(item, { ipfs: item.ipfs, item: item.item, updated: false});
        }, 5000);
    }

    function addItem(itemId) {
        sellSite.retrieveItem(itemId)
            .then(item => {
                sellSite.ipfs.getJSON(item.ipfsHash)
                .then( obj => {
                    const newVal = {ipfs: obj, item: item, updated: true};
                    self.items.unshift(newVal);
                    clearItemStatus(newVal);
                });
            });
    }
  
    function updateItem(itemId) {
        sellSite.retrieveItem(itemId)
            .then(item => {
                const prevValue = self.items().find(x => x.item.itemId == itemId);
                if (prevValue) {
                    const newVal = {ipfs: prevValue.ipfs, item: item, updated: true};
                    self.items.replace(prevValue, newVal);
                    clearItemStatus(newVal);
                }
        });
    }

    this.load = function() {
        sellSite.retrieveAllItems()
            .then(it => {
                $.each(it, (i,v) => retriveIPFSContent(v));
                this.loaded(true);
            });
        sellSite.addEventHandler(sellSite.Events.ValueChanged, 
            (name, data) => {
                updateItem(data.itemId);
            });
        sellSite.addEventHandler(sellSite.Events.PublishedItem, 
            (name, data) => {
                addItem(data.itemId);
            });
    };

    this.loadClaimList = function() {
        return sellSite.retrieveAllItems((item) => {
                return this.isOwn(item.owner) && item.state >= sellSite.State.Finished;
            })
            .then(it => {
                this.items.removeAll();
                $.each(it, (i,v) => retriveIPFSContent(v));
            });
    }
    
    this.installForClaimList = function() {
        const eventHandler = () => {
            this.loadClaimList();
        };

        if (this.actualAddress() !== "") {
            // only if the address is valid
            this.loadClaimList()
                .then(x => this.loaded(true));
        }
        else {
            this.loaded(true);
        }

        sellSite.addEventHandler(sellSite.Events.ItemSold, eventHandler);
        sellSite.addEventHandler(sellSite.Events.ItemPaid, eventHandler);
    };

    this.unload = function() {
        sellSite.clearAllEventHandlers();
    };

    this.isOwn = function(address) {
        return address.toUpperCase() == this.actualAddress().toUpperCase();
    };

    this.canOffer = function(item) {
        return item.state <= sellSite.State.Offered
            && item.owner.toUpperCase() != this.actualAddress().toUpperCase()
            && item.offerAddress.toUpperCase() != this.actualAddress().toUpperCase();
    };

    this.compactAddress = function(address) {
        return address ? address.substring(0,6) + ".." + address.substring(address.length - 4)
            : null;
    };

    this.endDate = function(item) {
        return new Date(item.finishDate * 1000).toISOString();
    };
};