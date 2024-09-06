// SPDX-License-Identifier: MIT

/*
 - Must be able to invite another player with a wager
 - Can accept the invite by matching the wager
 - Winner gets both wagers
    Commitment phase where an off-chain invite is signed and
    accepted, then once both players have committed the
    players deposit their wager (within a certain time frame) for the 
    game to begin.
        - Addresses can be punished for commiting and not depositing
            - Maybe ban from using Dapp
        - Transactions only occur if the game was accepted
        - Safe (contract holds the funds)
 - Maybe ban addresses that commit to games and fail to deposit


 - ISSUE: if one person deposits and the other doesnt how will they get their
          funds back

*/
pragma solidity >=0.8.2 <0.9.0;

contract reaction_time_1v1 {

    address public owner;

    struct Bet {
        uint wager;
        address opponent;
        bool paid;
    }

    //Only one game at a time per address
    //New bets will overwrite the existing bet
    mapping (address => Bet) public games;

    mapping(uint256 => bool) usedNonces;

    event NewGameCommited(uint wager, address challenger, address acceptor);
    event Funded(uint funds, address from);
    event PaymentTransfered(uint amount, address from);
    event BetResolved(uint amount, address to);

    constructor() payable {
        owner = msg.sender;
        emit Funded(msg.value, msg.sender);
    }

    function fund() public payable {
        require(msg.value > 0, "Must send some ETH");
        emit Funded(msg.value, msg.sender);
    }

    // May need a nonce in case of multiple indentical game (nonce managment by frontend)
    function commitGame (
        address challenger,
        address acceptor,
        uint256 wager,
        uint256 nonce,
        bytes memory challengerSignature,
        bytes memory acceptorSignature

    ) public {
        require(wager > 0, "Wager must be greater than 0");

        require(address(challenger).balance >= wager, "The challenger does not have enough funds");
        require(address(acceptor).balance >= wager, "The acceptor does not have enough funds");

        require(games[challenger].wager == 0, "A game currently exists for the challenger");
        require(games[acceptor].wager == 0, "A game currently exists for the acceptor");

        require(!usedNonces[nonce], "Used nonce");
        usedNonces[nonce] = true;

        bytes32 messageHash = getMessageHash(challenger, acceptor, wager, nonce);

        address recoveredChallenger = recoverSigner(messageHash, challengerSignature);
        require(recoveredChallenger == challenger, "Invalid challenger signature");

        address recoveredAcceptor = recoverSigner(messageHash, acceptorSignature);
        require(recoveredAcceptor == acceptor, "Invalid acceptor signature");

        games[challenger] = Bet({wager: wager, opponent: acceptor, paid: false});
        games[acceptor] = Bet({wager: wager, opponent: challenger, paid: false});
        emit NewGameCommited(wager, challenger, acceptor);
    } 

    function getMessageHash(address challengerAddress, address acceptorAddress, uint256 wager, uint256 nonce)
        internal
        pure
        returns (bytes32)
    {
        bytes memory message = abi.encodePacked(challengerAddress, acceptorAddress, wager, nonce);
        return keccak256(message);
    }

    function recoverSigner(bytes32 messageHash, bytes memory signature)
        internal
        pure
        returns (address)
    {
        (uint8 v, bytes32 r, bytes32 s) = splitSignature(signature);
        bytes32 prefixedHash = prefixed(messageHash);
        return ecrecover(prefixedHash, v, r, s);
    }

    //Straight from //https://docs.soliditylang.org/en/v0.8.26/solidity-by-example.html#creating-and-verifying-signatures
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
            // first 32 bytes, after the length prefix.
            r := mload(add(sig, 32))
            // second 32 bytes.
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes).
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function deposit() public payable {
        require(games[msg.sender].wager > 0, "This address has no commited games");
        require(games[msg.sender].paid == false, "This address has already transfered their deposit");
        require(games[msg.sender].wager <= msg.value, "Payment is insufficient for committed game's wager");

        games[msg.sender].paid = true;
        emit PaymentTransfered(msg.value, msg.sender);
    }

    function payoutWinner(address payable winner) public {
        require(msg.sender == owner, "Not the owner");

        require(address(this).balance >= games[winner].wager, "The contract does not have enough funds");

        require(games[winner].paid == true, "The wager has not yet been paid by both players");
        require(games[games[winner].opponent].paid == true, "The wager has not yet been paid by both players");

        uint prize = games[winner].wager * 2;
        winner.transfer(prize);
        emit BetResolved(prize, winner);
    }
}