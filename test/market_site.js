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
    const tx = await instance.publishItem("item ipfs", 20, 300, { from: accounts[1], value: 30 });
    const newId = tx.logs[0].args.itemId;
    return { id: newId, tx: tx };
  };

  // buy the previows item the account 2
  let buyDefault = async (id) => {
    const tx = await instance.offerItem(id, 300, { from: accounts[2], value: 400 });
    return { tx: tx };
  };

  beforeEach(async () => {
    instance = await MarketSite.new(10, 7);
  });

  it ("Validate creation params", async function () {
    assert.equal(0, await instance.itemsCount.call());
    assert.equal(10, await instance.publishCost.call());
    assert.equal(7 * 24 * 60 * 60, await instance.publishDays.call());
    assert.equal(accounts[0], await instance.owner());
  });

  it ("Fail creation with invalid params", async function() {

    verifyFail(async () => {
      await MarketSite.new(0,0);
    }, 'Publish days need be greater than zero' );
  });

  it ("Test publish an item", async function() {

    const balanceBeforeAcc0 = await web3.eth.getBalance(accounts[0]);
//    const balanceBeforeAcc1 = await web3.eth.getBalance(accounts[1]);
    const result = await createDefault();
    const balanceAfterAcc0 = await web3.eth.getBalance(accounts[0]);
//    const balanceAfterAcc1 = await web3.eth.getBalance(accounts[1]);
    
    assert.equal(1, await instance.itemsCount.call(), "Expected one item");
    assert.equal(1, result.id, "Expected id 1");
    assert.equal(new BN(balanceBeforeAcc0).add(new BN(10)).toString(), balanceAfterAcc0);
//    assert.equal(new BN(balanceBeforeAcc1).sub(new BN(10)).toString(), balanceAfterAcc1);

    assert.isTrue(result.tx.logs.length > 0, "Emit at least one event");
    assert.equal("PublishedItem", result.tx.logs[0].event);
  });

  it ("Test publish without enough founds", async function() {
    try {
      const tx = await instance.publishItem("item ipfs", 20, 30, { from: accounts[1], value: 5 });
      assert.fail("Must fail with insuficient founds");
    }
    catch(error) {
      checkErrorType(error.data, 'revert', 'Need more founds');
    }
  });

  it ("Test retrieve existent item", async function() {
    // create a valid item
    const createdInfo = await createDefault();

    // try to obtein
    const result = await instance.getItem(createdInfo.id);
    assert.equal("item ipfs", result.ipfsHash, "IPFS hash not match");
    assert.equal(accounts[1], result.owner, "Owner address not match");
    assert.equal("20", result.actualValue.toString(), "Init value not match");
    assert.equal(MarketSite.State.Published, result.state.toString(), "Item states not match");
    assert.equal(emptyAddress, result.offerAddress, "Offer address not match");
  });

  it ("Fail if the item does not exists", async function() {

    verifyFail(async () => {
      await instance.getItem(new BN("1"));
    },'Inexistent item' );
  });

  it ("Test offer over an existent item", async function() {
    let balanceBefore, balanceAfter, tx, result;
    // create a valid item
    await createDefault();

    tx = await instance.offerItem(1, 20, { from: accounts[2], value: 50 })

    // try to obtein
    result = await instance.getItem(1);
    assert.equal(accounts[2], result.offerAddress, "Offer address not match");
    assert.equal(20, result.actualValue, "Actual value not match");
    assert.equal(MarketSite.State.Offered, result.state.toString(), "Item states not match");
    assert.isTrue(tx.logs.length > 0, "Emit at least one event");
    assert.equal("ValueChanged", tx.logs[0].event);

    // try other offer, with more value
    balanceBefore = await web3.eth.getBalance(accounts[2]);
    tx = await instance.offerItem(1, 60, { from: accounts[3], value: 80 })
    balanceAfter = await web3.eth.getBalance(accounts[2]);

    result = await instance.getItem(1);
    console.log(result);
    assert.equal(accounts[3], result.offerAddress, "Offer address not match");
    assert.equal(60, result.actualValue, "Actual value not match");
    assert.isTrue(tx.logs.length > 0, "Emit at least one event");
    assert.equal("ValueChanged", tx.logs[0].event);
    assert.equal(new BN(balanceBefore).add(new BN(50)).toString(), balanceAfter, "Don't refund to prev offer");


    // other offer, but now lose because offer a minor value
    tx = await instance.offerItem(1, 70, { from: accounts[2], value: 79 })

    result = await instance.getItem(1);
    assert.equal(accounts[3], result.offerAddress, "Offer address not match");
    assert.equal(79, result.actualValue, "Actual value not match");
    assert.isTrue(tx.logs.length > 0, "Emit at least one event");
    assert.equal("ValueChanged", tx.logs[0].event);


    // account 2 retry and win the item
    balanceBefore = await web3.eth.getBalance(accounts[3]);
    tx = await instance.offerItem(1, 300, { from: accounts[2], value: 300 })
    balanceAfter = await web3.eth.getBalance(accounts[3]);

    result = await instance.getItem(1);
    assert.equal(accounts[2], result.offerAddress, "Offer address not match");
    assert.equal(300, result.actualValue, "Actual value not match");
    assert.equal(MarketSite.State.Finished, result.state.toString(), "Item states not match");
    assert.isTrue(tx.logs.length > 1, "Emit at least two events");
    assert.equal("ValueChanged", tx.logs[0].event);
    assert.equal("ItemSold", tx.logs[1].event);
    assert.equal(new BN(balanceBefore).add(new BN(80)).toString(), balanceAfter, "Don't refund to prev offer");
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
    const result = await createDefault();
    await buyDefault(result.id);

    balanceBeforeAcc1 = await web3.eth.getBalance(accounts[1]);
    balanceBeforeAcc2 = await web3.eth.getBalance(accounts[2]);

    // get the paid mount for the item
    tx = await instance.claimFounds(result.id, { from: accounts[1] });

    balanceAfterAcc1 = await web3.eth.getBalance(accounts[1]);
    balanceAfterAcc2 = await web3.eth.getBalance(accounts[2]);

    // check balance
    assert.equal(new BN(balanceBeforeAcc2).add(new BN(100)).toString(), balanceAfterAcc2, "Don't get the refound");
  
    const item = await instance.getItem(result.id);
    assert.equal(MarketSite.State.Payded, item.state.toString(), "Item states not match");
    assert.isTrue(tx.logs.length > 0, "Emit at least one event");
    assert.equal("ItemPaid", tx.logs[0].event);
    assert.equal(result.id.toString(), tx.logs[0].args.itemId.toString());
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

