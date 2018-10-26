import BN from "bn.js";
import ReputationMiningClient from "../ReputationMiner";

const ethers = require("ethers");

class MaliciousReputationMiningNoOriginReputation extends ReputationMiningClient {
  // This client will claim there is no originReputationUID, whether there is one or not
  //
  constructor(opts, entryToFalsify, amountToFalsify) {
    super(opts);
    this.entryToFalsify = entryToFalsify;
    this.amountToFalsify = amountToFalsify.toString();
  }

  async addSingleReputationUpdate(updateNumber, repCycle, blockNumber, checkForReplacement) {
    if (updateNumber.toNumber() === this.entryToFalsify){
      console.log('altering')
      this.alterThisEntry = true;
      const reputationKey = await this.getKeyForUpdateNumber(updateNumber);
      console.log(reputationKey)
      console.log(this.reputations[reputationKey])
      const reputationValue = new BN(this.reputations[reputationKey].slice(2, 66), 16);
      this.replacementAmount = reputationValue.muln(-1);
      console.log(this.replacementAmount)
    }
    await super.addSingleReputationUpdate(updateNumber, repCycle, blockNumber, checkForReplacement)
    this.alterThisEntry = false;
  }


  getAmount(i, _score) {
    let score = _score;
    if (i.toString() === this.entryToFalsify.toString()) {
      score = score.sub(score).sub(this.replacementAmount.toString());
    }
    return score;
  }

  async respondToChallenge() {
    const [round, index] = await this.getMySubmissionRoundAndIndex();
    const addr = await this.colonyNetwork.getReputationMiningCycle(true);
    const repCycle = new ethers.Contract(addr, this.repCycleContractDef.abi, this.realWallet);
    const submission = await repCycle.getDisputeRounds(round, index);
    const firstDisagreeIdx = submission[8];
    const lastAgreeIdx = firstDisagreeIdx.sub(1);
    const reputationKey = await this.getKeyForUpdateNumber(lastAgreeIdx);
    const lastAgreeKey = ReputationMiningClient.getHexString(lastAgreeIdx, 64);
    const firstDisagreeKey = ReputationMiningClient.getHexString(firstDisagreeIdx, 64);

    const [agreeStateBranchMask, agreeStateSiblings] = await this.justificationTree.getProof(lastAgreeKey);
    const [disagreeStateBranchMask, disagreeStateSiblings] = await this.justificationTree.getProof(firstDisagreeKey);
    let logEntryNumber = ethers.utils.bigNumberify(0);
    if (lastAgreeIdx.gte(this.nReputationsBeforeLatestLog)) {
      logEntryNumber = await this.getLogEntryNumberForLogUpdateNumber(lastAgreeIdx.sub(this.nReputationsBeforeLatestLog));
    }

    console.log([
      round,
      index,
      this.justificationHashes[firstDisagreeKey].justUpdatedProof.branchMask,
      this.justificationHashes[lastAgreeKey].nextUpdateProof.nNodes,
      ReputationMiningClient.getHexString(agreeStateBranchMask),
      this.justificationHashes[firstDisagreeKey].justUpdatedProof.nNodes,
      ReputationMiningClient.getHexString(disagreeStateBranchMask),
      this.justificationHashes[lastAgreeKey].newestReputationProof.branchMask,
      logEntryNumber,
      "0",
      this.justificationHashes[lastAgreeKey].originReputationProof.branchMask
    ],
      reputationKey,
      this.justificationHashes[firstDisagreeKey].justUpdatedProof.siblings,
      "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      agreeStateSiblings,
      this.justificationHashes[firstDisagreeKey].justUpdatedProof.value,
      disagreeStateSiblings,
      this.justificationHashes[lastAgreeKey].newestReputationProof.key,
      this.justificationHashes[lastAgreeKey].newestReputationProof.value,
      this.justificationHashes[lastAgreeKey].newestReputationProof.siblings,
      this.justificationHashes[lastAgreeKey].originReputationProof.key,
      "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      this.justificationHashes[lastAgreeKey].originReputationProof.siblings,)

    const tx = await repCycle.respondToChallenge(
      [
        round,
        index,
        this.justificationHashes[firstDisagreeKey].justUpdatedProof.branchMask,
        this.justificationHashes[lastAgreeKey].nextUpdateProof.nNodes,
        ReputationMiningClient.getHexString(agreeStateBranchMask),
        this.justificationHashes[firstDisagreeKey].justUpdatedProof.nNodes,
        ReputationMiningClient.getHexString(disagreeStateBranchMask),
        this.justificationHashes[lastAgreeKey].newestReputationProof.branchMask,
        logEntryNumber,
        "0",
        this.justificationHashes[lastAgreeKey].originReputationProof.branchMask
      ],
      reputationKey,
      this.justificationHashes[firstDisagreeKey].justUpdatedProof.siblings,
      this.justificationHashes[lastAgreeKey].nextUpdateProof.value,
      agreeStateSiblings,
      this.justificationHashes[firstDisagreeKey].justUpdatedProof.value,
      disagreeStateSiblings,
      this.justificationHashes[lastAgreeKey].newestReputationProof.key,
      this.justificationHashes[lastAgreeKey].newestReputationProof.value,
      this.justificationHashes[lastAgreeKey].newestReputationProof.siblings,
      this.justificationHashes[lastAgreeKey].originReputationProof.key,
      "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      this.justificationHashes[lastAgreeKey].originReputationProof.siblings,
      { gasLimit: 4000000 }
    );
    return tx;
  }
}

export default MaliciousReputationMiningNoOriginReputation;
