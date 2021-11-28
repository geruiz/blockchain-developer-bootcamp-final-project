# Design patterns used

## Inheritance and Interfaces

- The contract MarketSite inherits Ownable from OpenZeppelin to manage owner restricctions and their transference.
- The contract use the library Math from OpenZeppelin.  The function used is `max()` in `offerItem` implementation.

## Access Control Design Patterns

- Ownable is used to restrict access to assign new owner and change publication costs functions.  This is inherits from Ownable contract.