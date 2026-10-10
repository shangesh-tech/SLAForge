import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
} from "viem";

const messages: Record<string, string> = {
  NotMonitor: "Only the SLA monitor wallet can settle agreements.",
  InvalidNameLength: "The service name must be 3–60 characters.",
  InvalidDescriptionLength: "The description must be 30–1000 characters.",
  InvalidEndpointLength: "The endpoint URL must be 1–200 characters.",
  InvalidDocsUrlLength: "The documentation URL must be 1–200 characters.",
  InvalidUptimeTarget: "Uptime must be between 95% and 100%.",
  InvalidLatencyTarget: "Latency must be between 1 and 60,000 ms.",
  BondTooLow: "The bond must be at least 1 USDC.",
  BondTooHigh: "The bond can be at most 100 USDC.",
  ZeroAmount: "Enter an amount greater than zero.",
  InvalidPlanCount: "A service needs 1–6 plans.",
  InvalidPlanPrice: "Each plan must cost at least 1 USDC.",
  InvalidPlanDuration: "Plan durations must be between 5 minutes and 365 days.",
  ServiceNotFound: "This service does not exist.",
  NotServiceProvider: "Only the provider of this service can do that.",
  ServiceNotBonded:
    "This service is suspended until the provider posts a new bond.",
  ServiceAlreadyBonded: "This service is already bonded.",
  ServiceAlreadyDelisted: "This service is already delisted.",
  ServiceHasActiveAgreements:
    "This service has active agreements. Delist once they settle.",
  InvalidPlanIndex: "That plan does not exist.",
  AgreementNotFound: "This agreement does not exist.",
  AgreementNotActive: "This agreement is already settled.",
  AgreementNotEnded:
    "“SLA met” can only be reported after the service period ends.",
  NothingToWithdraw: "You have nothing to withdraw.",
  EnforcedPause: "SLAForge is paused. New activity is temporarily disabled.",
  ERC20InsufficientBalance: "Not enough USDC in your wallet.",
  ERC20InsufficientAllowance: "USDC approval is too low. Please try again.",
  SafeERC20FailedOperation: "The USDC transfer failed.",
};

/** Turns wallet and contract errors into a short message for the user. */
export function friendlyError(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError))
      return "Request cancelled in your wallet.";
    const revert = error.walk(
      (e) => e instanceof ContractFunctionRevertedError,
    );
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && messages[name]) return messages[name];
      if (revert.reason) return revert.reason;
    }
    if (/insufficient funds/i.test(error.message))
      return "Not enough USDC to pay for gas.";
    return error.shortMessage;
  }
  const code = (error as { code?: number })?.code;
  if (code === 4001) return "Request cancelled in your wallet.";
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
