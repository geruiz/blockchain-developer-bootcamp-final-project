// global constants
const IPFS_HOST = 'localhost';
const IPFS_PORT = 5001;
const IPFS_PUBLIC_URL = 'http://localhost:8080/ipfs/'

// global variables
var web3;
var ipfs;
var MarketSite;

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

function alert(message, type, where) {
    var wrapper = $('<div class="alert alert-dismissible fade show" role="alert"></div>')
        .addClass('alert-' + type)
        .text(message)
        .append($('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>'));
    (where || $(".main.container")).prepend(wrapper);
  }

function showErrorMessage(e, where) {
    console.log(e);
    alert(e.message || e, "danger", where);
}

function showSuccessMessage(e, where) {
    console.log(e);
    alert(e.message || e, "success", where);
}

function installWeb3() {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
        throw new Error("Metamask is not installed");
    }
    web3 = new Web3(window.ethereum);
    web3.currentProvider.on('connect', showAddress);
    web3.currentProvider.on('disconnect', showAddress);
    web3.currentProvider.on('accountsChanged', showAddress);
    showAddress();
    marketSite =  new MarketSite(
        new web3.eth.Contract(MarketSiteABI.abi, MarketSiteAddress),
        ipfs,
        showErrorMessage);
}

function installIPFS() {
    if (!window.IpfsHttpClient) {
        throw new Error("IPFS client not detected!");
    }
    ipfs = window.IpfsHttpClient.create({ host: IPFS_HOST, port: IPFS_PORT });
}

function installNavBar() {
    $("a.nav-link").removeClass("disabled");
    $("a.nav-link").click(function(e) {
        e.preventDefault();
        let url = e.target.href;
        url = url.substring(url.indexOf('#')+ 1);
        $.get(url + ".html", function (data) {
            $(".nav-link.active").removeClass("active");
            $("body").trigger('replacePane');
            $(".main.container").empty()
                .append(data);
            $(e.target).addClass("active");
        });
        return false;
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

window.onload=function() {
    try {
        installIPFS();
        installWeb3();
        installNavBar();
    }
    catch (e) {
        showErrorMessage(e);
    }
};
