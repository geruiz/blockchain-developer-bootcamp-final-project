const emptyAddress = "0x0000000000000000000000000000000000000000";
const BN = web3.utils.BN;
const MarketSite = artifacts.require("MarketSite");

//
// Helper function to check error reasons
//
function checkErrorType(data, error, reason) {
  for (var n in data) {
    if (n.startsWith('0x')) {
      var errorInfo = data[n];
      assert.equal(error, errorInfo.error);
      assert.equal(reason, errorInfo.reason);
      return;
    }
  }
}

//
// Helper function to check error messages
//
async function verifyFail(fn, errorMsg) {
  try {
    await fn();
    assert.fail("Must fail");
  }
  catch (error) {
    checkErrorType(error.data, 'revert', errorMsg);
  }
}


// 
// Test main contract
//
contract("MarketSite", accounts => {

  let instance;

  // create a new item with initial price value of 20 and max price value of 300 for the account number 1
  let createDefault = async () => {
    const tx = await instance.publishItem("item ipfs", 20, 300, { from: accounts[1], value: 10 });
    const newId = tx.logs[0].args.itemId;
    return { id: newId, tx: tx };
  };

  // create an new bid for the item id received as parameter.  Use the account number 2.
  let buyDefault = async (id) => {
    const tx = await instance.offerItem(id, 300, { from: accounts[2], value: 400 });
    return { tx: tx };
  };

  // used to verify item state
  let verifyItem = async (itemId, address, actualValue, state) => {
    const result = await instance.getItem(itemId);
    assert.equal(result.offerAddress, address, "Offer address not match");
    assert.equal(result.actualValue, actualValue, "Actual price not match");
    assert.equal(result.state.toString(), state, "Item states not match");
  };

  // used to verfity transaction results
  let verifyEvents = (tx, logName) => {
    assert.isTrue(tx.logs.length > 0, "Emit at least one event");
    assert.equal(tx.logs[0].event, logName);
  };

  // contract used in each test
  beforeEach(async () => {
    // 10 wei for publication fee and 7 for expiration days
    instance = await MarketSite.new(10, 7);
  });


  it ("Validate creation params", async function () {
    assert.equal(await instance.itemsCount.call(), 0);
    assert.equal(await instance.getPublicationCost(), 10);
    assert.equal(await instance.getPublicationDays(), 7 * 24 * 60 * 60);
    assert.equal(await instance.owner(), accounts[0]);
  });


  it ("Creation failed due to invalid parameters", async function() {
    verifyFail(async () => {
      await MarketSite.new(0,0);
    }, 'Publish days need be greater than zero' );
  });


  it ("Setting a new publication fee test", async function() {
    const tx = await instance.setPublicationCost(30,  { from: accounts[0] });

    assert.equal(await instance.getPublicationCost(), 30, "The value of the publication fee is not the expected one");
    verifyEvents(tx, "PublicationCost");
  });


  it ("Verify that it fails when trying to change the publication fee from an account other than the owners' account", async function() {
    verifyFail(async () => {
      await instance.setPublicationCost(30,  { from: accounts[1] });
    }, 'Ownable: caller is not the owner' );
  });


  it ("Item publication test", async function() {
    const balanceBeforeAcc0 = await web3.eth.getBalance(accounts[0]);
    // in this case, transfer more founds
    const tx = await instance.publishItem("item ipfs", 20, 300, { from: accounts[1], value: 50 }); 
    const newId = tx.logs[0].args.itemId;
    const balanceAfterAcc0 = await web3.eth.getBalance(accounts[0]);
    
    assert.equal(await instance.itemsCount.call(), 1, "One item is expected");
    assert.equal(newId, 1, "Id 1 is expected");
    assert.equal(balanceAfterAcc0, new BN(balanceBeforeAcc0).add(new BN(10)).toString(), "Is expected  that the owner receive the publication fee");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(0).toString(), "Contract balance is different than zero");

    verifyEvents(tx, "PublishedItem");
  });


  it ("Fail when the publication has not enough funds", async function() {
    verifyFail(async () => {
      await instance.publishItem("item ipfs", 20, 30, { from: accounts[1], value: 5 });
    }, 'Insufficient funds' );
  });


  it ("Fail when the publication has invalid parameters", async function() {
    verifyFail(async () => {
      await instance.publishItem("item ipfs", 30, 20, { from: accounts[1], value: 10 });
    }, 'Minimum value is not less or equal than maximum value' );
  });


  it ("Retrieve existent item test", async function() {
    // create a valid item
    const createdInfo = await createDefault();

    const result = await instance.getItem(createdInfo.id);
    assert.equal(result.ipfsHash, "item ipfs", "IPFS hash not match");
    assert.equal(result.owner, accounts[1], "Owner address not match");
    assert.equal(result.actualValue.toString(), "20", "Init value not match");
    assert.equal(result.state.toString(), MarketSite.State.Published, "Item states not match");
    assert.equal(result.offerAddress, emptyAddress, "Offer address not match");
  });


  it ("Fail when the item is inexistent", async function() {
    verifyFail(async () => {
      await instance.getItem(new BN("1"));
    },'Inexistent item' );
  });


  it ("Try multiple bids on an existing item in order to review all status changes", async function() {
    let balanceBefore, balanceAfter,  tx;

    // create a valid item
    await createDefault();

    assert.equal(new BN(0).toString(), await web3.eth.getBalance(instance.address), "The contract must start without funds");

    // initial bid
    tx = await instance.offerItem(1, 20, { from: accounts[2], value: 50 });

    await verifyItem(1, accounts[2], 20, MarketSite.State.Offered);
    verifyEvents(tx, "ValueChanged");
    assert.equal(new BN(50).toString(), await web3.eth.getBalance(instance.address), "The contract has not been funded");


    // second bid, from other account and a highest price
    balanceBefore = await web3.eth.getBalance(accounts[2]);
    tx = await instance.offerItem(1, 60, { from: accounts[3], value: 80 });
    balanceAfter = await web3.eth.getBalance(accounts[2]);

    await verifyItem(1, accounts[3], 60, MarketSite.State.Offered);
    verifyEvents(tx, "ValueChanged");
    assert.equal(new BN(balanceBefore).add(new BN(50)).toString(), balanceAfter, "No refund has been made");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(80).toString(), "Account balance is not consistent");


    // third bid, with a minor price bid value
    tx = await instance.offerItem(1, 70, { from: accounts[2], value: 79 })
    await verifyItem(1, accounts[3], 79, MarketSite.State.Offered);
    verifyEvents(tx, "ValueChanged");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(80).toString(), "Account balance is not consistent");


    // fourth bid, with a bid value higher than actual
    balanceBefore = await web3.eth.getBalance(accounts[3]);
    tx = await instance.offerItem(1, 300, { from: accounts[2], value: 300 })
    balanceAfter = await web3.eth.getBalance(accounts[3]);

    await verifyItem(1, accounts[2], 300, MarketSite.State.Finished);
    assert.isTrue(tx.logs.length > 1, "Emit at least two events");
    assert.equal(tx.logs[0].event, "ValueChanged");
    assert.equal(tx.logs[1].event, "ItemSold");
    assert.equal(new BN(balanceBefore).add(new BN(80)).toString(), balanceAfter, "The refund of the previous offer is not made");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(300).toString(), "Contract balance is not consistent");

  });


  it ("Fail when the bid is less than funds", async function() {
    await createDefault();

    verifyFail(async () => {
      await instance.offerItem(1, 20, { from: accounts[2], value: 10 })
    },'Insufficient funds' );
  });

  it ("Fails when the bid is lower than the current one", async function() {
    await createDefault();

    verifyFail(async () => {
      await instance.offerItem(1, 5, { from: accounts[2], value: 10 })
    },'The new bid value cannot be lower than the current bid value' );
  });


  it ("Fail when the offer is from the owner", async function() {
    await createDefault();

    verifyFail( async () => {
      await instance.offerItem(1, 20, { from: accounts[1], value: 100 });
   }, 'Is the item owner');
  });


  it ("Claim funds by the item owner", async function() {
    // item created by account 1 with max price value of 300
    const result = await createDefault();
    // account 2 create a bid of 300 and 400 is the max value
    await buyDefault(result.id);

    balanceBeforeAcc1 = await web3.eth.getBalance(accounts[1]);
    balanceBeforeAcc2 = await web3.eth.getBalance(accounts[2]);

    // get the paid value for the item (regardless of gas price)
    const tx = await instance.claimFounds(result.id, { from: accounts[1], gasPrice: 0 });

    balanceAfterAcc1 = await web3.eth.getBalance(accounts[1]);
    balanceAfterAcc2 = await web3.eth.getBalance(accounts[2]);

    await verifyItem(result.id, accounts[2], 300, MarketSite.State.Payded);
    verifyEvents(tx, "ItemPaid");
    assert.equal(result.id.toString(), tx.logs[0].args.itemId.toString());

    // Checks the balances of the accounts involved
    // This is expected:
    //   account number 1 increases 300
    //   account number 2 increases 100 as a refund (it had paid 400)
    //   contract account keep in zero
    assert.equal(balanceAfterAcc1.toString(), new BN(balanceBeforeAcc1).add(new BN(300)).toString(),  "The seller's account does not have the expected balance");
    assert.equal(balanceAfterAcc2.toString(), new BN(balanceBeforeAcc2).add(new BN(100)).toString(),  "The buyer's account does not have the expected balance");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(0).toString(), "Contract balance is not consistent");
  });

  
  it ("Fails when try to claim funds belonging to another account", async function() {
    const result = await createDefault();
    await buyDefault(result.id);

    verifyFail( async () => {
      await instance.claimFounds(result.id, { from: accounts[3] });  // account 3 is not the owner
    }, 'Isn\'t the item owner');
  });


  it ("Fail when try to claims funds for an unsold item", async function() {
    const result = await createDefault();

    verifyFail( async () => {
      await instance.claimFounds(result.id, { from: accounts[1] });
    }, 'Item is unsold');
  });

});

