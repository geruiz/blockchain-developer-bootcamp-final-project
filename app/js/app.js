// global constants
// Previously I used a local instalation of IPFS with ipfs-http-client, but this is incompatible with pinata service.
// I keep the creation function, but it is not called
const IPFS_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

const NETWORK = '127.0.0.1:7545';  // expected network

// global variables
var web3;
var marketSite;

function showAddress() {
    const prov = web3.currentProvider;
    let newVal;
    if (prov.isConnected()) {
        newVal = prov.selectedAddress ? prov.selectedAddress : "Connected";
    }
    else {
        newVal = "Disconnected";
    }
    $("#info_address").text(newVal);
    $("body").trigger('changeAddress', { connected: prov.isConnected(), address: prov.selectedAddress });
}

function alertMsg(message, type, where) {
    var wrapper = $('<div class="alert alert-dismissible fade show" role="alert"></div>')
        .addClass('alert-' + type)
        .text(message)
        .append($('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>'));
    (where || $(".alert-container")).prepend(wrapper);
  }

function showErrorMessage(e, where) {
    console.log(e);
    alertMsg(e.message || e, "danger", where);
}

function showSuccessMessage(e, where) {
    console.log(e);
    alertMsg(e.message || e, "success", where);
}

function installWeb3() {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
        return Promise.reject("Metamask is not installed");
    }
    web3 = new Web3(window.ethereum);
    var contract = new web3.eth.Contract(MarketSiteABI.abi, MarketSiteAddress);
    return contract.methods.owner().call()
        .then(() => {
            marketSite =  new MarketSite(contract, showErrorMessage);
            web3.currentProvider.on('connect', showAddress);
            web3.currentProvider.on('disconnect', showAddress);
            web3.currentProvider.on('accountsChanged', showAddress);
            showAddress();
        })
        .catch( e => { 
            console.log(e);
            return Promise.reject("Don't detect the contract. Is installed? Do you connect to the correct network?" +
            " Expect: " + NETWORK + ". Check parameters and reload this page.");
        });
}

// unused
function installIPFS() {
    if (!window.IpfsHttpClient) {
        return Promise.reject("IPFS client not detected!");
    }
    ipfs = window.IpfsHttpClient.create({ host: IPFS_HOST, port: IPFS_PORT, protocol: IPFS_PROTOCOL, apiPath: IPFS_APIPATH });
    return Promise.resolve(ipfs);
}

function installNavBar() {
    return new Promise((resolve, reject) => {
        try {
            $("a.nav-link").removeClass("disabled");
            $("a.nav-link").click(function(e) {
                e.preventDefault();
                let url = e.target.href;
                url = url.substring(url.indexOf('#')+ 1);
                $.get(url + ".html", function (data) {
                    $(".alert-container").empty();
                    $(".nav-link.active").removeClass("active");
                    $("body").trigger('replacePane');
                    $(".main").empty()
                        .append(data);
                    $(e.target).addClass("active");
                });
                return false;
            });
            resolve();
        }
        catch (e) {
            reject(e);
        }
    });
}

function getUserAddress() {
    var address = web3.currentProvider.selectedAddress;
    if (address) {
        return Promise.resolve(address);
    }
    else {
        return web3.currentProvider
            .request({ method: 'eth_requestAccounts' })
            .then((accounts) => accounts[0]);
    }
}

// wrapper over ajax function of jQuery to returns a Promise
function ajax(options) {
    return new Promise(function (resolve, reject) {
        $.ajax(options).done(resolve).fail(reject);
    });
}

window.onload=function() {
    installWeb3()
        .then(installNavBar)
        .catch((e) => {
            showErrorMessage(e);
        });
};
