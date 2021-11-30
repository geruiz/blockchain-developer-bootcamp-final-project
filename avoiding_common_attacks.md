# Contract security measures

- SWC-134 Message call with hardcoded gas amount
The smart contract use `.call{value:...}()` instead of `transfer()` or `send()` without fixed values.  

- SWC-118 Incorrect constructor name
The smart contract has a valid constructor and receives the initialisation parameters.

- SWC-110 Assert violation
The smart contract uses `require()` statement instead of `assert()` for check conditions.

- SWC-108 State variable default visibility
All variables defined in the smart contract have their visibility specified.

- SWC-107 Reentrancy
Prevent reentrancy by making state changes before the funds transfer call is executed.  For example, when the offer price is refunded to the previous buyer, this refund is made after the assignment of the new buyer.  In `claimFunds` function, first the change of state is made and then the transfer of funds takes place.

- SWC-105 Unprotected Ether Withdrawal
The are verifications in the smart contract to ensure the correct transfer of funds. These actions can only be done by the right users.

- SWC-103 Floating Pragma
The smart contract uses a specific compiler version.

- SWC-100 Function default visibility
All functions defined in the smart contract have their visibility specified.

- Proper Use of Require, Assert and Revert 
All functions that make changes to the contract use `require()` statements.

- Use Modifiers Only for Validation 
The modifiers defined are used only for validation.

- Checks-Effects-Interactions (Avoiding state changes after external calls)
All external calls (use of `call{value:...}()`) are made after state changes are performed.
