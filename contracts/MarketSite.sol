// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @title Marketplace site implementation for bidding using this smart contract.
/// @author Germán Ruiz 
/// @notice This contract allows publish, bid and pay for items. 
/// @dev Automatic finalization and delivery agreement is not implemented.
contract MarketSite is Ownable {

  /// @notice item's state. Can be:
  ///    Published:  Created and ready to be offered.
  ///    Offered: The item have one bid.
  ///    Finished:  The ítem publication is closed because the time runs out or its price is the expected by the owner.
  ///    Payded:  The item's owner reclaimed the pay.
  /// @dev Adding a delivery agreement will need new states.
  enum State { Published, Offered, Finished, Payded }

  /// @notice The highest actual bid for the product.
  /// @dev It consists of the address of the buyer and the maximum amount to be paid (already transferred to the contract wallet).
  struct Offert {
    address payable who;
    uint maxBet;
  }

  /// @notice Information about the item (or product) to be sell
  struct Item {
      // File containing the product description in IPFS
      string ipfsHash;
      // Owner's address 
      address payable owner;
      // Actual price. If not present, the initial price
      uint actualValue;
      // Minimum price value expected by the owner
      uint maxValue;
      // Bid timeout
      uint finishDate;
      // State of the item
      State state;
      // Offer or zero if don't have one
      Offert actualOffer;
  }

  /// @notice Item lists
  mapping (uint => Item) private items;

  /// @notice Items counts.
  /// @dev The value is equal to the last one created.
  uint public itemsCount;

  /// @notice Publication fee, defined when the contract is created.
  uint private publicationCost; 
  /// @notice Validity of publication (in days), defined when the contract is created.
  uint private publicationDays;

  /// @notice Inform about a new item to be sold
  /// @param itemId Item id to allow its access.
  event PublishedItem(uint itemId);
  
  /// @notice Report a change about the price of a product. This is because an offer has been made.
  /// @param itemId Modified item id.
  /// @param betValue New value to be paid for the product.
  /// @param betAddress Account address for the new buyer.
  event ValueChanged(uint itemId, uint betValue, address betAddress);

  /// @notice Reports a sale that has been made.  This happens when the offer price reaches the 
  /// maximum value defined by the seller for this product.
  /// @dev This event also will be triggered when the timeout functionality is implemented.
  /// @param itemId Item id 
  event ItemSold(uint itemId);

  /// @notice This event occurs when the sales price of a product is paid to the seller.  If there 
  /// is a difference with the final value, this difference is refunded to the buyer. 
  /// @param itemId Item id.
  event ItemPaid(uint itemId);

  /// @notice Notifies the modification of the publication fee by the contract owner.
  /// @param publicationCost The new publication fee.
  event PublicationCost(uint publicationCost);

  /// @notice Checks whether there are sufficient funds to carry out this operation.
  modifier haveFunds(uint _value) {
    require(msg.value >= _value, "Insufficient funds"); 
    _;
  }

  /// @notice Checks if the received item id exists
  modifier existsItem(uint _id) {
    require(0 < _id && _id <= itemsCount , "Inexistent item"); 
    _;
  }

  /// @notice Checks if the item is active
  modifier isPublished(uint _id) {
    require(items[_id].state == State.Published || items[_id].state == State.Offered, "Item is not offered"); 
    _;
  }

  /// @notice Checks if the item is sold out
  modifier isSold(uint _id) {
    require(items[_id].state == State.Finished, "Item is unsold"); 
    _;
  }

  /// @notice Checks if the item owner is the sender
  modifier isItemOwner(uint _id) {
    require(items[_id].owner == msg.sender, "Isn't the item owner");
    _;
  }

  /// @notice Checks if the item owner is not the sender
  modifier isNotItemOwner(uint _id) {
    require(items[_id].owner != msg.sender, "Is the item owner");
    _;
  }

  /// @notice Checks if the min value is less or equal than the maximun value received.
  /// @param _minValue Minimun value
  /// @param _maxValue Maximum value
  modifier amountAreValids(uint _minValue, uint _maxValue) {
    require(_minValue <= _maxValue, "Minimum value is not less or equal than maximum value");
    _;
  }

  /// @notice Contract constructor.
  /// @param _publicationCost Value to be transfered to the contract owner when a publication is created. Can be 0.
  /// @param _publicationDays Number of days that a publication will be active.
  constructor(uint _publicationCost, uint _publicationDays) {
    require(_publicationDays > 0, "The number of days of publication of items must be greater than zero");
    itemsCount = 0;
    publicationCost = _publicationCost;
    publicationDays = 1 days * _publicationDays;
  }


  /// @notice Create a new publication.
  /// @param _ipfsHash File hash that contains information about the product.
  /// @param _baseValue Initial price value of the product to be sell.
  /// @param _expectedValue Expected price value. When the bid raises this value, the 
  ///   item publication is marked as sold.
  function publishItem(string memory _ipfsHash, uint _baseValue, uint _expectedValue) public payable 
    haveFunds(publicationCost)
    amountAreValids(_baseValue, _expectedValue) {

    // transfer publication fee to contract owner    
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

  /// @notice Returns the data of a publication. It is used to access this data.
  /// @param _itemId Item id
  /// @dev It does not export the current maximum bid value.
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

   /// @notice Create an offer for an item.
   /// @param _itemId Item id to be bid.
   /// @param _value Actual price value to be paid for this product.
   /// @dev This function uses the message value as maximum price value to be paid. This operation refunds
   ///  the previous buyer if the new offer is higher than the previous one.
  function offerItem(uint _itemId, uint _value) public payable 
    existsItem(_itemId)
    isPublished(_itemId)
    haveFunds(_value)
    isNotItemOwner(_itemId) {

      Item storage item = items[_itemId];
      bool success;
      require(item.actualValue < _value || 
        // same price value only permited as first offer
        (item.actualValue == _value && item.state == State.Published), "The new bid value cannot be lower than the current bid value");

      if (item.state == State.Published) {
        // first offer for the product.
        item.actualValue = _value;
        item.actualOffer.who = payable(msg.sender);
        item.actualOffer.maxBet = msg.value;
        item.state = State.Offered;

        // transfer bid amount to the contract address
        (success, ) = address(this).call{value:msg.value}("");   
        require(success, "The transfer has failed");
      }
      else {
        if (item.actualOffer.maxBet >= msg.value) {
          item.actualValue = msg.value;

          // Sender bid is below that the current one.  The funds will be returned to the buyer
          (success, ) = payable(msg.sender).call{value:msg.value}("");   
          require(success, "The refund has failed");
        }
        else {
          // There is a new higher bid
          address payable prevOwner = item.actualOffer.who;
          uint prevBet = item.actualOffer.maxBet;

          item.actualValue = Math.max(item.actualOffer.maxBet + 1, _value);
          item.actualOffer.who = payable(msg.sender);
          item.actualOffer.maxBet = msg.value;

          // transfer bid amount price to the contract    
          (success, ) = address(this).call{value:msg.value}("");
          require(success, "The transfer has failed");

          // Refunds to the previous buyer
          (success, ) = prevOwner.call{value:prevBet}("");
          require(success, "The refund has failed");
        }
      }
      emit ValueChanged(_itemId, item.actualValue, item.actualOffer.who);
      if (item.actualValue >= item.maxValue) {
        item.state = State.Finished;
        emit ItemSold(_itemId);
      }
  }

  /// @notice This function allows the seller to claim the value received from the sale of his product.
  /// @param _itemId Item id.
  function claimFounds(uint _itemId) public 
    existsItem(_itemId)
    isSold(_itemId)
    isItemOwner(_itemId) {

      // mark the item as paid
      items[_itemId].state = State.Payded;

      // transfers the amount paid for the item to the owner
      (bool success, ) = msg.sender.call{value:items[_itemId].actualValue}("");
      require(success, "The transfer has failed");

      // returns the difference between the bid price and the maximum price paid (if applicable)
      uint diff = items[_itemId].actualOffer.maxBet - items[_itemId].actualValue;
      if (diff > 0) {
        (success, ) = items[_itemId].actualOffer.who.call{value: diff}("");
        require(success, "The transfer has failed");
      }
      emit ItemPaid(_itemId);
  }

  /// @notice Returns the publication fee
  function getPublicationCost() public view 
    returns (uint) {
      return publicationCost;
  }

  /// @notice Set a new value for the publication fee
  function setPublicationCost(uint _publicationCost) public
    onlyOwner() {
      publicationCost = _publicationCost;
      emit PublicationCost(_publicationCost);
  }

  /// @notice Returns the expiration time of the publication (as seconds)
  function getPublicationDays() public view 
    returns (uint) {
      return publicationDays;
  }

  /// @notice Function to receive Ether. msg.data must be empty
  /// @dev This allows funds to be moved to the contract.
  receive() external payable {}

  /// @notice Fallback function is called when msg.data is not empty
  /// @dev This allows funds to be moved to the contract.
  fallback() external payable {}
}
