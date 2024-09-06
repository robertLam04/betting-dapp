import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { Timing_game } from "../typechain-types";

describe("TimingGame", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTimingGameFixture() {
    const INITIAL_FUNDS = hre.ethers.parseEther("10");

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const TimingGameFactory = await hre.ethers.getContractFactory("timing_game");
    const timingGame = await TimingGameFactory.deploy({ value: INITIAL_FUNDS }) as Timing_game;

    return { timingGame, INITIAL_FUNDS, owner, otherAccount };
  }

  describe("Deployment", function () {

    it("Should set the right owner", async function () {
      const { timingGame, owner } = await loadFixture(deployTimingGameFixture);

      expect(await timingGame.owner()).to.equal(owner.address);
    });

    it("Should receive and store the initial funds", async function () {
      const { timingGame, INITIAL_FUNDS } = await loadFixture(
        deployTimingGameFixture
      );

      expect(await hre.ethers.provider.getBalance(timingGame.getAddress())).to.equal(
        INITIAL_FUNDS
      );
    });

  });

  describe("Place Bet", function () {
    it("Should place a bet and emit newBetPlaced event", async function () {
      const { timingGame, otherAccount } = await loadFixture(deployTimingGameFixture);
      const betAmount = hre.ethers.parseEther("0.1");

      await expect(timingGame.connect(otherAccount).placeBet({ value: betAmount }))
        .to.emit(timingGame, "newBetPlaced")
        .withArgs(betAmount, otherAccount.address);

      expect(await timingGame.bets(otherAccount.address)).to.equal(betAmount);
    });
  });

  describe("Resolve Bet", function () {
    it("Should resolve bet and transfer prize to winner", async function () {
      const { timingGame, owner, otherAccount } = await loadFixture(deployTimingGameFixture);
      const betAmount = hre.ethers.parseEther("0.1");
      const prizeAmount = hre.ethers.parseEther("0.5");

      await timingGame.connect(otherAccount).placeBet({ value: betAmount });

      await expect(() => timingGame.resolveBet(otherAccount.address))
        .to.changeEtherBalances(
          [otherAccount, timingGame],
          [prizeAmount, -prizeAmount]
        );

      expect(await timingGame.resolveBet(otherAccount.address))
        .to.emit(timingGame, "BetResolved")
        .withArgs(prizeAmount, otherAccount);

      expect(await timingGame.bets(otherAccount.address)).to.equal(0);
    });

    it("Should revert if non-owner tries to resolve bet", async function () {
      const { timingGame, otherAccount } = await loadFixture(deployTimingGameFixture);

      await expect(timingGame.connect(otherAccount).resolveBet(otherAccount.address)).to.be.revertedWith("Not the owner");
    });
  });

  describe("Get Balance", function () {
    it("Should return the correct balance", async function () {
      const { timingGame } = await loadFixture(deployTimingGameFixture);

      const contractBalance = await hre.ethers.provider.getBalance(timingGame.getAddress());
      expect(await timingGame.getBalance()).to.equal(contractBalance);
    });
  });
});