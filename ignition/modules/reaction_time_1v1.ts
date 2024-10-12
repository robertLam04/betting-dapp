import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const INITIAL_FUNDS: bigint = 1_000_000_000_000n;

const ReactionTimeModule = buildModule("ReactionTime1v1Module", (m) => {
  const initialFunds = m.getParameter("initialFunds", INITIAL_FUNDS);

  const reaction_time_1v1 = m.contract("reaction_time_1v1", [], {
    value: initialFunds,
  });

  return { reaction_time_1v1 };
});

export default ReactionTimeModule;
