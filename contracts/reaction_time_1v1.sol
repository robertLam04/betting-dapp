// SPDX-License-Identifier: MIT

pragma solidity >=0.8.2 <0.9.0;

contract reaction_time_1v1 {

    address public owner;
    uint256 public timeoutPeriod = 1 minutes;

    struct Bet {
        address opponent;
        uint wager;
        uint nonce;
        bool paid;
        uint256 startTime;
    }

    mapping (address => Bet) public games;

    mapping(uint256 => bool) usedNonces;

    event NewGameCommitted(address challenger, address acceptor, uint wager, uint nonce);
    event Funded(uint funds, address from);
    event PaymentTransfered(uint amount, address from);
    event GameReady(address challenger, address acceptor, uint wager, uint nonce);
    event BetResolved(uint amount, address to);
    event BetWithdrawn(address player, uint amount);

    constructor() payable {
        owner = msg.sender;
        emit Funded(msg.value, msg.sender);
    }

    function fund() public payable {
        require(msg.value > 0, "Must send some ETH");
        emit Funded(msg.value, msg.sender);
    }

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

        games[challenger] = Bet({opponent: acceptor, wager: wager, nonce: nonce, paid: false, startTime: block.timestamp});
        games[acceptor] = Bet({opponent: challenger, wager: wager, nonce: nonce, paid: false, startTime: block.timestamp});
        emit NewGameCommitted(challenger, acceptor, wager, nonce);
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

    //From //https://docs.soliditylang.org/en/v0.8.26/solidity-by-example.html#creating-and-verifying-signatures
    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        require(sig.length == 65);

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function resetCommittedGame(address playerAddress) public {
        require(msg.sender == owner, "Not the Owner");
        require(games[playerAddress].wager > 0, "This address has no committed games");
        games[playerAddress].wager = 0;
    }

    function deposit() public payable {
        Bet storage game = games[msg.sender];

        require(game.wager > 0, "This address has no commited games");
        require(!game.paid, "This address has already transfered their deposit");
        require(game.wager <= msg.value, "Payment is insufficient for committed game's wager");

        game.paid = true;
        emit PaymentTransfered(msg.value, msg.sender);
        
        // If both wagers are submitted the game is ready
        if (games[game.opponent].paid == true) {
            emit GameReady(game.opponent, msg.sender, game.wager, game.nonce);
        }
    }

    function withdraw() public {
        require(games[msg.sender].wager > 0, "No active game for this address");
        require(games[msg.sender].paid == true, "You have not yet deposited your funds");

        // Check if the timeout period has passed and the opponent hasn't deposited
        require(block.timestamp >= games[msg.sender].startTime + timeoutPeriod, "The timeout period has not yet passed");
        require(games[games[msg.sender].opponent].paid == false, "Opponent has already deposited");

        payable(msg.sender).transfer(games[msg.sender].wager);
        emit BetWithdrawn(msg.sender, games[msg.sender].wager);

        // Reset the game
        games[msg.sender].wager = 0;
        games[games[msg.sender].opponent].wager = 0;
    }

    function payoutWinner(address payable winner) public {
        require(msg.sender == owner, "Not the owner");

        require(address(this).balance >= games[winner].wager, "The contract does not have enough funds");

        require(games[winner].wager > 0, "This address is not apart of any commited games");
        require(games[winner].paid == true, "The wager has not yet been paid by both players");
        require(games[games[winner].opponent].paid == true, "The wager has not yet been paid by both players");

        uint prize = games[winner].wager * 2;
        winner.transfer(prize);
        emit BetResolved(prize, winner);

        games[winner].wager = 0;
        games[games[winner].opponent].wager = 0;
    }
}