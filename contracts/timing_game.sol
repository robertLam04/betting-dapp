// SPDX-License-Identifier: MIT

pragma solidity >=0.8.2 <0.9.0;

contract timing_game {

    mapping (address => uint) public bets;

    address public owner;

    event newBetPlaced(uint wager, address from);
    event BetResolved(uint prize, address winner);
    event Funded(uint funds, address from);

    //Payable contructor for inital funding
    constructor() payable {
        owner = msg.sender;
        emit Funded(msg.value, msg.sender);
    }

    function deposit() public payable {
        require(msg.value > 0, "Must send some ETH");
        emit Funded(msg.value, msg.sender);
    }

    //Get from adress and wager (requires sufficient balance)
    //Raise an event represeting the placed bet
    function placeBet() public payable {
        require(msg.value > 0, "Bet amount must be greater than 0");
        emit newBetPlaced(msg.value, msg.sender);
        bets[msg.sender] = msg.value;
    }

    //Owner resolves the bet if user wins
    function resolveBet(address payable winner) public  {
        require(msg.sender == owner, "Not the owner");
        uint prize = bets[winner] * 5;

        require(address(this).balance >= prize, "The contract does not have enough funds");
        winner.transfer(prize);
        emit BetResolved(prize, winner);
        bets[winner] = 0; // Reset the bet
        
    }

    //View only functions are cheap beacause they don't alter state
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
}