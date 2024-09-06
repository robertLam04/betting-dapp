import {
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import hre from "hardhat";
import { Reaction_time_1v1 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { getNumber } from "ethers";

async function prepareCommitGame(reaction_time_1v1: Reaction_time_1v1, challenger: HardhatEthersSigner, acceptor: HardhatEthersSigner, wager: bigint, nonce: number) {
  const messageHash = hre.ethers.solidityPackedKeccak256(
    ["address", "address", "uint256", "uint256"],
    [challenger.address, acceptor.address, wager, nonce]
  );

  const challengerSignature = await challenger.signMessage(hre.ethers.getBytes(messageHash));
  const acceptorSignature = await acceptor.signMessage(hre.ethers.getBytes(messageHash));

  return { messageHash, challengerSignature, acceptorSignature };
}

describe("ReactionTime1v1", function () {

  async function deployReactionTime1v1Fixture() {
    const INITIAL_FUNDS = hre.ethers.parseEther("10");

    // Contracts are deployed using the first signer/account by default
    const [owner, challenger, acceptor, otherAccount1, otherAccount2] = await hre.ethers.getSigners();

    const ReactionTime1v1Factory = await hre.ethers.getContractFactory("reaction_time_1v1");
    const reaction_time_1v1 = await ReactionTime1v1Factory.deploy({ value: INITIAL_FUNDS }) as Reaction_time_1v1;

    return { reaction_time_1v1, INITIAL_FUNDS, owner, challenger, acceptor, otherAccount1, otherAccount2 };
  }

  describe("Deployment", function () {

    it("Should set the right owner", async function () {
      const { reaction_time_1v1, owner } = await loadFixture(deployReactionTime1v1Fixture);
      expect(await reaction_time_1v1.owner()).to.equal(owner.address);
    });

    it("Should receive and store the initial funds", async function () {
      const { reaction_time_1v1, INITIAL_FUNDS } = await loadFixture(deployReactionTime1v1Fixture);

      expect(await hre.ethers.provider.getBalance(reaction_time_1v1.getAddress())).to.equal(
        INITIAL_FUNDS
      );
    });
  });

  describe("Commit Game", function () {
    it("Should allow a valid game commit", async function () {
      const { reaction_time_1v1, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("0.1");
      const nonce = 1;
  
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
  
      await expect(
        reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature)
      ).to.emit(reaction_time_1v1, "NewGameCommited").withArgs(wager, challenger.address, acceptor.address);

    });
  
    it("Should revert if a game already exists for either player", async function () {
      const { reaction_time_1v1, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("0.1");
      const nonce = 1;
  
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
      
      //Pre commit game
      await reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature);
  
      await expect(
        reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature)
      ).to.be.revertedWith("A game currently exists for the challenger");
    });
  
  
    it("Should revert if the nonce has already been used", async function () {
      const { reaction_time_1v1, challenger, acceptor, otherAccount1, otherAccount2 } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("0.1");
      const nonce = 1;
  
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
      
      const { challengerSignature: otherAccount1Sig, acceptorSignature: otherAccount2Sig } = await prepareCommitGame(reaction_time_1v1, otherAccount1, otherAccount2, wager, nonce)

      //Commit a game with nonce=1 but other addresses
      await reaction_time_1v1.commitGame(otherAccount1.address, otherAccount2.address, wager, nonce, otherAccount1Sig, otherAccount2Sig);
  
      //Try another game with new addresses but same nonce=1
      await expect(
        reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature)
      ).to.be.revertedWith("Used nonce");
    });

    it("Should revert if message signatures are invalid", async function () {

      const { reaction_time_1v1, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
      const nonce = 1;

      //Valid messageHash
      const messageHash = hre.ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256"],
        [challenger.address, acceptor.address, wager, nonce]
      );

      //Invalid messageHash
      const breakMessage = 69;
      const invalidMessageHash = hre.ethers.solidityPackedKeccak256(
        ["address", "address", "uint256", "uint256", "uint256"],
        [challenger.address, acceptor.address, wager, nonce, breakMessage]
      );
  
      const challengerSignature = await challenger.signMessage(hre.ethers.getBytes(invalidMessageHash));
      const acceptorSignature = await acceptor.signMessage(hre.ethers.getBytes(messageHash));

      await expect(
        reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature)
      ).to.be.revertedWith("Invalid challenger signature");
      
    });
  });

  describe("Deposit", function () {
    it("Should accept valid payment, emit event and set msg.sender's game property 'payed' to true", async function () {
      const { reaction_time_1v1, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
      const nonce = 1;

      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);

      await reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature);

      expect(await reaction_time_1v1.connect(challenger).deposit({ value: wager })).to.emit(reaction_time_1v1, "PaymentTransfered").withArgs(wager, challenger)

      const game = await reaction_time_1v1.games(challenger.address);
      expect(game.paid).to.be.true;
    });

    it("Should revert if there is no committed game for the sender", async function () {
      const { reaction_time_1v1, challenger } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
    
      // Attempting to deposit without committing a game should revert
      await expect(
        reaction_time_1v1.connect(challenger).deposit({ value: wager })
      ).to.be.revertedWith("This address has no commited games");
    });

    it("Should revert if the sender has already transferred their deposit", async function () {
      const { reaction_time_1v1, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
      const nonce = 1;
    
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
    
      await reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature);
    
      // First deposit should be successful
      await reaction_time_1v1.connect(challenger).deposit({ value: wager });
    
      // Second deposit should revert
      await expect(
        reaction_time_1v1.connect(challenger).deposit({ value: wager })
      ).to.be.revertedWith("This address has already transfered their deposit");
    });
    
    it("Should revert if the payment is insufficient for the committed game's wager", async function () {
      const { reaction_time_1v1, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
      const insufficientWager = hre.ethers.parseEther("0.5");
      const nonce = 1;
    
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
    
      await reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature);
    
      // Attempting to deposit less than the committed wager should revert
      await expect(
        reaction_time_1v1.connect(challenger).deposit({ value: insufficientWager })
      ).to.be.revertedWith("Payment is insufficient for committed game's wager");
    });    
  });

  describe("Payout Winner", async function () {
    it("Should successfully transfer the prize to the winner and emit BetResolved event", async function () {
      const { reaction_time_1v1, owner, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
      const nonce = 1;
    
      // Prepare and commit the game
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
      await reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature);
    
      // Both players deposit their wagers
      await reaction_time_1v1.connect(challenger).deposit({ value: wager });
      await reaction_time_1v1.connect(acceptor).deposit({ value: wager });

      const initialBalance = await hre.ethers.provider.getBalance(challenger.address);
      
      // Owner calls payoutWinner
      await expect(reaction_time_1v1.connect(owner).payoutWinner(challenger.address))
        .to.emit(reaction_time_1v1, "BetResolved")
        .withArgs(wager * BigInt(2), challenger.address);
    
      // Check that the winner received the correct prize
      const finalBalance = await hre.ethers.provider.getBalance(challenger.address);
      expect(finalBalance).to.equal(initialBalance + wager * BigInt(2));
    });

    it("Should revert if a non-owner tries to call payoutWinner", async function () {
      const { reaction_time_1v1, challenger } = await loadFixture(deployReactionTime1v1Fixture);
    
      await expect(reaction_time_1v1.connect(challenger).payoutWinner(challenger.address))
        .to.be.revertedWith("Not the owner");
    });

    it("Should revert if the wager has not yet been paid by both players", async function () {
      const { reaction_time_1v1, owner, challenger, acceptor } = await loadFixture(deployReactionTime1v1Fixture);
      const wager = hre.ethers.parseEther("1");
      const nonce = 1;
    
      // Prepare and commit the game
      const { challengerSignature, acceptorSignature } = await prepareCommitGame(reaction_time_1v1, challenger, acceptor, wager, nonce);
      await reaction_time_1v1.commitGame(challenger.address, acceptor.address, wager, nonce, challengerSignature, acceptorSignature);
    
      // Only challenger deposits their wager
      await reaction_time_1v1.connect(challenger).deposit({ value: wager });
    
      // Attempt to payout
      await expect(reaction_time_1v1.connect(owner).payoutWinner(challenger.address))
        .to.be.revertedWith("The wager has not yet been paid by both players");
    });

  })
});