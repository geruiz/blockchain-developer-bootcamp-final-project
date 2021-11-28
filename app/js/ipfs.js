
// wrapper over jQuery ajax to returns a Promise
function ajax(options) {
    return new Promise(function (resolve, reject) {
        $.ajax(options).done(resolve).fail(reject);
    });
}

/**
 * IPFS client to talk with Infura service or a local instalation.
 */
function ipfsApiClient() {
    const IPFS_GATEWAY = 'https://ipfs.infura.io/ipfs/';

    this.client = window.IpfsHttpClient.create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https'});

    /**
     * Add a new file.
     * @param {object} obj JS Object saved as JSON
     * @returns a Promise that evaluate to String, with the new file id.
     */
    this.addJSON = function(obj) {
        return this.client.add(JSON.stringify(obj))
            .then(data => Promise.resolve(data.path));
    }

    /**
     * Retrieve the content of a file saved as JSON.
     * @param {string} id File id
     * @returns a Primise that evaluate to a JS Object.
     */
    this.getJSON = function(id) {
        return ajax({
                method: 'GET',
                url: IPFS_GATEWAY + id
            });
    }
}

/**
 * IPFS to be used with Pinata service.
 */
function ipfsPinata() {
    const IPFS_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

    /**
     * Add a new file.
     * @param {object} obj JS Object saved as JSON
     * @returns a Promise that evaluate to String, with the new file id.
     */
    this.addJSON = function(obj) {
        // You need add your own keys
        return ajax({
                method: 'POST',
                url: IPFS_URL,
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify(obj),
                headers: {
                    pinata_api_key: '',
                    pinata_secret_api_key: ''
                }
            })
            .then(data => Promise.resolve(data.IpfsHash));
    }

    /**
     * Retrieve the content of a file saved as JSON.
     * @param {string} id File id
     * @returns a Primise that evaluate to a JS Object.
     */
    this.getJSON = function(id) {
        return ajax({
            method: 'GET',
            url: IPFS_GATEWAY + id
        });
    }
}
                 
