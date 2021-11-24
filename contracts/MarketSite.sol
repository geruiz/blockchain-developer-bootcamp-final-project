// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MarketSite is Ownable, ReentrancyGuard {

  // item's state. Can be:
  //    Published:  Created and ready to be offered.
  //    Offered: The item have one offer.
  //    Finished:  The ítem was finished because a timeout or its price is the expected by the owner.
  //    Payded:  Next to be finished, the item's owner reclaim the pay
  enum State { Published, Offered, Finished, Payded }

  // Actual best offert to buy
  struct Offert {
    address payable who;
    uint maxBet;
  }

  // Item in sell
  struct Item {
      // item description
      string ipfsHash;
      // owner's item
      address payable owner;
      // actual value or initial value if don't have one
      uint actualValue;
      // maximum value expected by the owner
      uint maxValue;
      // finish time
      uint finishDate;
      // actual state of the item
      State state;
      // actual offer or zero if don't have one
      Offert actualOffer;
  }

  // Item lists and count
  mapping (uint => Item) private items;
  uint public itemsCount;

  // Publish values, defined at moment of create the contract
  uint public publishCost; 
  uint public publishDays;

  /**
   * Events
   */
  event PublishedItem(uint itemId);
  
  event ValueChanged(uint itemId, uint betValue, address betAddress);

  event ItemSold(uint itemId);

  event ItemPaid(uint itemId);

  /**
   * Modifiers
   */
  // has enough found to made the operation
  modifier haveFounds(uint _value) {
    require(msg.value >= _value, "Need more founds"); 
    _;
  }

  // exists the received item id
  modifier existsItem(uint _id) {
    require(0 < _id && _id <= itemsCount , "Inexistent item"); 
    _;
  }

  // check is the item is active
  modifier isPublished(uint _id) {
    require(items[_id].state == State.Published || items[_id].state == State.Offered, "Item is not offered"); 
    _;
  }

  // check is the item is sold
  modifier isSold(uint _id) {
    require(items[_id].state == State.Finished && items[_id].actualValue >= items[_id].maxValue, "Item isn't sold"); 
    _;
  }

  // check is the item owner
  modifier isItemOwner(uint _id) {
    require(items[_id].owner == msg.sender, "Isn't the item owner");
    _;
  }

  // check is not the item owner
  modifier isNotItemOwner(uint _id) {
    require(items[_id].owner != msg.sender, "Is the item owner");
    _;
  }

  /**
   * Constructor.  Expects:
   *    - publish cost to transfer at owner.
   *    - cant of days that the publication is active.
   */
  constructor(uint _publishCost, uint _publishDays) {
    require(_publishDays > 0, "Publish days need be greater than zero");
    itemsCount = 0;
    publishCost = _publishCost;
    publishDays = 1 days * _publishDays;
  }

  /**
   * Create a item publication and emits the new id.
   * Expects:
   *   - ipfs id with the articule description.
   *   - Base price.
   *   - Expected max value.
   */ 
  function publishItem(string memory _ipfsHash, uint _baseValue, uint _expectedValue) public payable 
    haveFounds(publishCost) {

    // transfer publication cost to contract owner    
    (bool success, ) = payable(address(owner())).call{value:publishCost}("");
    require(success, "Transfer failed.");

    if (publishCost < msg.value) {
      (success, ) = payable(msg.sender).call{value:msg.value - publishCost}("");
      require(success, "Transfer difference failed.");
    }

    itemsCount++;
    items[itemsCount] = 
      Item({
        ipfsHash: _ipfsHash,
        owner: payable (msg.sender),
        actualValue: _baseValue,
        maxValue: _expectedValue,
        finishDate: block.timestamp + publishDays,
        state: State.Published,
        actualOffer: Offert({ who: payable (address(0)), maxBet: 0})
      });
    emit PublishedItem(itemsCount);
  }

  /**
   * Getter function.
   */
  function getItem(uint _itemId) public view 
    existsItem(_itemId)
    returns (uint itemId, string memory ipfsHash, address owner, uint finishDate,
        uint actualValue, uint state, address offerAddress) {

      Item memory item = items[_itemId];
      itemId = _itemId;
      ipfsHash = item.ipfsHash;
      owner = item.owner;
      finishDate = item.finishDate;
      actualValue = item.actualValue;
      state = uint(item.state);
      offerAddress = item.actualOffer.who;
  }

  /**
   * Create an offer for an item.
   * Expects:
   *     - The item id.
   *     - The value to paid for it.
   *     - The total transfer value is used as maximum value to paid.
   */
  function offerItem(uint _itemId, uint _value) public payable 
    existsItem(_itemId)
    isPublished(_itemId)
    haveFounds(_value) 
    isNotItemOwner(_itemId)
    nonReentrant() {

      Item storage item = items[_itemId];
      bool success;
      require(item.actualValue < _value || 
        // same value only permited as first offer
        (item.actualValue == _value && item.state == State.Published), "Max value can not be below value");

      if (item.state == State.Published) {
        // first offer.  The item don't have one
        item.actualValue = _value;
        item.actualOffer.who = payable(msg.sender);
        item.actualOffer.maxBet = msg.value;
        item.state = State.Offered;

        // transfer bet amount to the contract 
        (success, ) = address(this).call{value:msg.value}("");   
        require(success, "Transfer failed.");
      }
      else {
        if (item.actualOffer.maxBet >= msg.value) {
          item.actualValue = msg.value;

          // Sender offer is below that existent one.  We returns their founds.
          (success, ) = payable(msg.sender).call{value:msg.value}("");   
          require(success, "Refund transfer failed.");
        }
        else {
          // offer change and refund
          address payable prevOwner = item.actualOffer.who;
          uint prevBet = item.actualOffer.maxBet;

          item.actualValue = Math.max(item.actualOffer.maxBet + 1, _value);
          item.actualOffer.who = payable(msg.sender);
          item.actualOffer.maxBet = msg.value;

          // transfer bet amount to the contract    
          (success, ) = address(this).call{value:msg.value}("");
          require(success, "Transfer failed.");

          (success, ) = prevOwner.call{value:prevBet}("");
          require(success, "Refund failed.");
        }
      }
      emit ValueChanged(_itemId, item.actualValue, item.actualOffer.who);
      if (item.actualValue >= item.maxValue) {
        item.state = State.Finished;
        emit ItemSold(_itemId);
      }
  }

  function claimFounds(uint _itemId) public 
    existsItem(_itemId)
    isSold(_itemId)
    isItemOwner(_itemId) {

      // mark the item as payded
      items[_itemId].state = State.Payded;

      // transfer the mount to the owner
      (bool success, ) = msg.sender.call{value:items[_itemId].actualValue}("");
      require(success, "Transfer failed.");

      // Refund the difference (if exists)
      uint diff = items[_itemId].actualOffer.maxBet - items[_itemId].actualValue;
      if (diff > 0) {
        (success, ) = items[_itemId].actualOffer.who.call{value: diff}("");
        require(success, "Transfer failed.");
      }
      emit ItemPaid(_itemId);
  }

  // Function to receive Ether. msg.data must be empty
  receive() external payable {}

  // Fallback function is called when msg.data is not empty
  fallback() external payable {}
}
