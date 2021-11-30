# Design patterns used

## Inheritance and Interfaces

- The MarketSite smart contract inherits Ownable from OpenZeppelin for the management of owner restrictions and transfer of ownership.
- The smart contract uses the library Math from OpenZeppelin.  The function used is `max()` in `offerItem` implementation.

## Access Control Design Patterns

- Ownable is used to restrict access in assigning a new owner and change the publication fee. This is inherits from Ownable contract.
