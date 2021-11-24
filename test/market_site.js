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

  // create and item with init value 20 and max value 300 for the account 1
  let createDefault = async () => {
    const tx = await instance.publishItem("item ipfs", 20, 300, { from: accounts[1], value: 10 });
    const newId = tx.logs[0].args.itemId;
    return { id: newId, tx: tx };
  };

  // buy the previows item the account 2
  let buyDefault = async (id) => {
    const tx = await instance.offerItem(id, 300, { from: accounts[2], value: 400 });
    return { tx: tx };
  };

  // used to verify item state
  let verifyItem = async (itemId, address, actualValue, state) => {
    const result = await instance.getItem(itemId);
    assert.equal(result.offerAddress, address, "Offer address not match");
    assert.equal(result.actualValue, actualValue, "Actual value not match");
    assert.equal(result.state.toString(), state, "Item states not match");
  };

  // user to verfity transaction resuits
  let verifyEvents = (tx, logName) => {
    assert.isTrue(tx.logs.length > 0, "Emit at least one event");
    assert.equal(tx.logs[0].event, logName);
  };

  // contract used in every test
  beforeEach(async () => {
    // 10 wei for publication cost and 7 valid days
    instance = await MarketSite.new(10, 7);
  });


  it ("Validate creation params", async function () {
    assert.equal(await instance.itemsCount.call(), 0);
    assert.equal(await instance.publishCost.call(), 10);
    assert.equal(await instance.publishDays.call(), 7 * 24 * 60 * 60);
    assert.equal(await instance.owner(), accounts[0]);
  });


  it ("Fail creation with invalid params", async function() {
    verifyFail(async () => {
      await MarketSite.new(0,0);
    }, 'Publish days need be greater than zero' );
  });


  it ("Test publish an item", async function() {

    const balanceBeforeAcc0 = await web3.eth.getBalance(accounts[0]);
    // in this case, transfer more founds
    const tx = await instance.publishItem("item ipfs", 20, 300, { from: accounts[1], value: 50 }); 
    const newId = tx.logs[0].args.itemId;
    const balanceAfterAcc0 = await web3.eth.getBalance(accounts[0]);
    
    assert.equal(await instance.itemsCount.call(), 1, "Expected one item");
    assert.equal(newId, 1, "Expected id 1");
    assert.equal(balanceAfterAcc0, new BN(balanceBeforeAcc0).add(new BN(10)).toString(), "Expected owner receive publication value");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(0).toString(), "Contract balance keep in zero");

    verifyEvents(tx, "PublishedItem");
  });

  it ("Test publish without enough founds", async function() {
    verifyFail(async () => {
      await instance.publishItem("item ipfs", 20, 30, { from: accounts[1], value: 5 });
    }, 'Need more founds' );
  });

  it ("Test retrieve existent item", async function() {
    // create a valid item
    const createdInfo = await createDefault();

    // try to obtein
    const result = await instance.getItem(createdInfo.id);
    assert.equal(result.ipfsHash, "item ipfs", "IPFS hash not match");
    assert.equal(result.owner, accounts[1], "Owner address not match");
    assert.equal(result.actualValue.toString(), "20", "Init value not match");
    assert.equal(result.state.toString(), MarketSite.State.Published, "Item states not match");
    assert.equal(result.offerAddress, emptyAddress, "Offer address not match");
  });

  it ("Fail if the item does not exists", async function() {

    verifyFail(async () => {
      await instance.getItem(new BN("1"));
    },'Inexistent item' );
  });

  it ("Test a series of offers over an existent item to review all states changes", async function() {
    let balanceBefore, balanceAfter,  tx;

    // create a valid item
    await createDefault();

    assert.equal(new BN(0).toString(), await web3.eth.getBalance(instance.address), "Start with founds in the contract!");

    // initial offer
    tx = await instance.offerItem(1, 20, { from: accounts[2], value: 50 });

    await verifyItem(1, accounts[2], 20, MarketSite.State.Offered);
    verifyEvents(tx, "ValueChanged");
    assert.equal(new BN(50).toString(), await web3.eth.getBalance(instance.address), "The contract don't receive founds");


    // second offer, from other account and more value to paid
    balanceBefore = await web3.eth.getBalance(accounts[2]);
    tx = await instance.offerItem(1, 60, { from: accounts[3], value: 80 });
    balanceAfter = await web3.eth.getBalance(accounts[2]);

    await verifyItem(1, accounts[3], 60, MarketSite.State.Offered);
    verifyEvents(tx, "ValueChanged");
    assert.equal(new BN(balanceBefore).add(new BN(50)).toString(), balanceAfter, "Don't refund to prev offer");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(80).toString(), "Don't match contract balance");


    // third offer, but now lose because offer a minor value
    tx = await instance.offerItem(1, 70, { from: accounts[2], value: 79 })
    await verifyItem(1, accounts[3], 79, MarketSite.State.Offered);
    verifyEvents(tx, "ValueChanged");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(80).toString(), "Don't match contract balance");


    // fourth offer.  Now with a bigger value and win the item
    balanceBefore = await web3.eth.getBalance(accounts[3]);
    tx = await instance.offerItem(1, 300, { from: accounts[2], value: 300 })
    balanceAfter = await web3.eth.getBalance(accounts[3]);

    await verifyItem(1, accounts[2], 300, MarketSite.State.Finished);
    assert.isTrue(tx.logs.length > 1, "Emit at least two events");
    assert.equal(tx.logs[0].event, "ValueChanged");
    assert.equal(tx.logs[1].event, "ItemSold");
    assert.equal(new BN(balanceBefore).add(new BN(80)).toString(), balanceAfter, "Don't refund to prev offer");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(300).toString(), "Don't match contract balance");

  });

  it ("Test fail offer with less founds", async function() {
    await createDefault();

    verifyFail(async () => {
      await instance.offerItem(1, 20, { from: accounts[2], value: 10 })
    },'Need more founds' );

  });

  it ("Test fail if offer the owner", async function() {
    await createDefault();

    verifyFail( async () => {
      await instance.offerItem(1, 20, { from: accounts[1], value: 100 });
   }, 'Is the item owner');
  });

  it ("Test claim founds by the item owner", async function() {
    // item created by account 1 with max value of 300
    const result = await createDefault();
    // account 2 by offer 300 and using 400 as max value
    await buyDefault(result.id);

    balanceBeforeAcc1 = await web3.eth.getBalance(accounts[1]);
    balanceBeforeAcc2 = await web3.eth.getBalance(accounts[2]);

    // get the paid mount for the item (don't care about the used gas)
    const tx = await instance.claimFounds(result.id, { from: accounts[1], gasPrice: 0 });

    balanceAfterAcc1 = await web3.eth.getBalance(accounts[1]);
    balanceAfterAcc2 = await web3.eth.getBalance(accounts[2]);

    await verifyItem(result.id, accounts[2], 300, MarketSite.State.Payded);
    verifyEvents(tx, "ItemPaid");
    assert.equal(result.id.toString(), tx.logs[0].args.itemId.toString());

    // check balance of involves accounts
    // we expects: 
    //   account1 have +300 in his balance
    //   account2 have +100 in his balance, as a refund (he paid 400)
    //   contract account keep in zero
    assert.equal(balanceAfterAcc1.toString(), new BN(balanceBeforeAcc1).add(new BN(300)).toString(),  "Don't get the refound");
    assert.equal(balanceAfterAcc2.toString(), new BN(balanceBeforeAcc2).add(new BN(100)).toString(),  "Don't get the refound");
    assert.equal(await web3.eth.getBalance(instance.address), new BN(0).toString(), "Don't match contract balance");
  });

  it ("Test fail claims founds from other account", async function() {
    const result = await createDefault();
    await buyDefault(result.id);

    verifyFail( async () => {
      await instance.claimFounds(result.id, { from: accounts[3] });  // account 3 is not the owner
    }, 'Isn\'t the item owner');
  });


  it ("Test fail claims founds when item is not sold", async function() {
    const result = await createDefault();

    verifyFail( async () => {
      await instance.claimFounds(result.id, { from: accounts[1] });
    }, 'Item isn\'t sold');
  });

});

