const fs = require('fs');

var MarketSite = artifacts.require("./MarketSite.sol");

module.exports = function(deployer) {
  deployer.deploy(MarketSite, 10, 7)
    .then(() => {
        var stream = fs.createWriteStream("./app/js/contract_constant.js");
        stream.once('open', function(fd) {
          stream.write("var MarketSiteAddress='");
          stream.write(MarketSite.address)
          stream.write("';\nvar MarketSiteABI=");
          stream.write(fs.readFileSync("./build/contracts/MarketSite.json"));
          stream.write(";\n");
          stream.end();
        });
      });
};