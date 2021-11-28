// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Contract that implements a market site using bets.
/// @author Germán Ruiz 
/// @notice This contract permits publish, bet and pay for products. 
/// @dev Automatic finalization and delivery agreement is not implemented.
contract MarketSite is Ownable {

  /// @notice item's state. Can be:
  ///    Published:  Created and ready to be offered.
  ///    Offered: The item have one offer.
  ///    Finished:  The ítem was finished because a timeout or its price is the expected by the owner.
  ///    Payded:  Next to be finished, the item's owner reclaim the pay.
  /// @dev Adding a delivery agreement will need new states.
  enum State { Published, Offered, Finished, Payded }

  /// @notice Actual best offert to buy the product.
  /// @dev Consist of the buyer address and the max amount to paid (already in the contract wallet).
  struct Offert {
    address payable who;
    uint maxBet;
  }

  /// @notice Information about the item (or product) in sell
  struct Item {
      // item file description in IPFS
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

  /// @notice Item lists
  mapping (uint => Item) private items;

  /// @notice Items counts.
  /// @dev The value coincides with the last one created.
  uint public itemsCount;

  /// @notice Publication cost, defined at contract creation moment.
  uint private publicationCost; 
  /// @notice Validity of publication (in days), defined at contract creation moment.
  uint private publicationDays;

  /// @notice Inform about a new item in the market.
  /// @param itemId Item id to allow your access.
  event PublishedItem(uint itemId);
  
  /// @notice Inform about a changed over a product. This is because a bet happened.
  /// @param itemId Item id changed.
  /// @param betValue New value to paid for the product.
  /// @param betAddress Account address for the possible buyer.
  event ValueChanged(uint itemId, uint betValue, address betAddress);

  /// @notice Inform about a shell was made.  This success when a bet value reached the
  /// maximum value for this product.
  /// @dev Also will be emit when add time finalization feature.
  /// @param itemId Item id for the product.
  event ItemSold(uint itemId);

  /// @notice Inform about a item was paided.  This happens when the sale of a product is 
  ///    paid to the seller.  If there is a difference with the final value, this is repaid
  ///    to the buyer. 
  /// @param itemId Item id for the product.
  event ItemPaid(uint itemId);

  /// @notice Inform about the change of the publication costs by the contract owner.
  /// @param publicationCost The new publication cost.
  event PublicationCost(uint publicationCost);

  /// @notice Check if has enough found to made the operation.
  modifier haveFounds(uint _value) {
    require(msg.value >= _value, "Need more founds"); 
    _;
  }

  /// @notice Check if exists the received item id
  modifier existsItem(uint _id) {
    require(0 < _id && _id <= itemsCount , "Inexistent item"); 
    _;
  }

  /// @notice Check is the item is active
  modifier isPublished(uint _id) {
    require(items[_id].state == State.Published || items[_id].state == State.Offered, "Item is not offered"); 
    _;
  }

  /// @notice Check is the item is sold
  modifier isSold(uint _id) {
    require(items[_id].state == State.Finished, "Item isn't sold"); 
    _;
  }

  /// @notice Check is the item owner is the sender
  modifier isItemOwner(uint _id) {
    require(items[_id].owner == msg.sender, "Isn't the item owner");
    _;
  }

  /// @notice Check is the item owner is not the sender
  modifier isNotItemOwner(uint _id) {
    require(items[_id].owner != msg.sender, "Is the item owner");
    _;
  }

  /// @notice Check if the minor amount is less or equal than the maximun received.
  /// @param _minValue Minimun value
  /// @param _maxValue Maximum value
  modifier amountAreValids(uint _minValue, uint _maxValue) {
    require(_minValue <= _maxValue, "The expected minor amount is not");
    _;
  }

  /// @notice Contract constructor.
  /// @param _publicationCost Value to transfer at owner when a publication is created. Can be 0.
  /// @param _publicationDays Number of days a publication is active.
  constructor(uint _publicationCost, uint _publicationDays) {
    require(_publicationDays > 0, "Publish days need be greater than zero");
    itemsCount = 0;
    publicationCost = _publicationCost;
    publicationDays = 1 days * _publicationDays;
  }


  /// @notice Create a new publication.
  /// @param _ipfsHash File id wich one contains information about this product.
  /// @param _baseValue Initial value to shell this product.
  /// @param _expectedValue Expected maximum value.  If the bet raise this value, the 
  ///    publication is marked as sold.
  function publishItem(string memory _ipfsHash, uint _baseValue, uint _expectedValue) public payable 
    haveFounds(publicationCost)
    amountAreValids(_baseValue, _expectedValue) {

    // transfer publication cost to contract owner    
    (bool success, ) = payable(address(owner())).call{value:publicationCost}("");
    require(success, "Transfer failed.");

    if (publicationCost < msg.value) {
      (success, ) = payable(msg.sender).call{value:msg.value - publicationCost}("");
      require(success, "Transfer difference failed.");
    }

    itemsCount++;
    items[itemsCount] = 
      Item({
        ipfsHash: _ipfsHash,
        owner: payable (msg.sender),
        actualValue: _baseValue,
        maxValue: _expectedValue,
        finishDate: block.timestamp + publicationDays,
        state: State.Published,
        actualOffer: Offert({ who: payable (address(0)), maxBet: 0})
      });
    emit PublishedItem(itemsCount);
  }

  /// @notice Allow access to a product information. Used to retrieve them.
  /// @param _itemId Item id
  /// @dev Not export all item information, to keep hidden the max bet value.
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
   /// @notice Create an offer over an item.
   /// @param _itemId Item id to bet.
   /// @param _value Actual value to paid for this product.
   /// @dev Also, is used the message value as maximum value to paid.  This transaction 
   ///    refund to the previus if the bet is better.
  function offerItem(uint _itemId, uint _value) public payable 
    existsItem(_itemId)
    isPublished(_itemId)
    haveFounds(_value)
    isNotItemOwner(_itemId) {

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

  /// @notice This allow reclaim the value payed for the product by the seller.
  /// @param _itemId Item id sold.
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

  /// @notice Retrieve the publication cost
  function getPublicationCost() public view 
    returns (uint) {
      return publicationCost;
  }

  /// @notice Allows change the publication cost
  function setPublicationCost(uint _publicationCost) public
    onlyOwner() {
      publicationCost = _publicationCost;
      emit PublicationCost(_publicationCost);
  }

  /// @notice Retrieve the publication duration (as seconds)
  function getPublicationDays() public view 
    returns (uint) {
      return publicationDays;
  }

  /// @notice Function to receive Ether. msg.data must be empty
  /// @dev This allow move found to the contract.
  receive() external payable {}

  /// @notice Fallback function is called when msg.data is not empty
  /// @dev This allow move found to the contract.
  fallback() external payable {}
}
