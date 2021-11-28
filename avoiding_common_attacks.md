# Contract security measures

- SWC-134 Message call with hardcoded gas amount
The contract use `.call{value:...}()` instead of `transfer()` or `send()` without fixed values.  

- SWC-118 Incorrect constructor name
The contract has a correct constructor, wich one receive initialization params.

- SWC-110 Assert violation
The contract uses `requiere()` statement instead of `assert()` for check conditions.

- SWC-108 State variable default visibility
All variables defined in the contract have their visibility specified.

- SWC-107 Reentrancy
Prevee reentrancy doing state changes before transfer funds call is executed.  For example, when the bet amount is refund, this is made after the new owner assignment.  In `claimFounds` function, first is the state change and next the founds transferences.

- SWC-105 Unprotected Ether Withdrawal
The are controls in the contract to ensure the correct transfer of funds. These actions can only be done by the right users.

- SWC-103 Floating Pragma
The contract uses a specific compiler version.

- SWC-100 Function default visibility
All functions defined in the contract have their visibility specified.

- Proper Use of Require, Assert and Revert 
All functions that made contract changes use `requiere()` statements.

- Use Modifiers Only for Validation 
The modifiers defined are used only for validation.

- Checks-Effects-Interactions (Avoiding state changes after external calls)
All external calls (use of `call{value:...}()` ) are after state changes.
