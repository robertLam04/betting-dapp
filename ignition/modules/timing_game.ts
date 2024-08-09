import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_FUNDS: bigint = 1_000_000_000_000n;

const TimingGameModule = buildModule("TimingGameModule", (m) => {
  const initialFunds = m.getParameter("initialFunds", INITIAL_FUNDS);

  const timingGame = m.contract("timing_game", [], {
    value: initialFunds,
  });

  return { timingGame };
});

export default TimingGameModule;
