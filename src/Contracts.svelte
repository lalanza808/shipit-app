<script>

  import { defaultEvmStores as evm, selectedAccount, contracts, web3 } from 'svelte-web3';
  import IERC721 from '@openzeppelin/contracts/build/contracts/IERC721.json';
  import IERC1155 from '@openzeppelin/contracts/build/contracts/IERC1155.json';
  import ShipIt from './lib/shipit.json';

  const shipit = '0x0E81fEC357adB73B2066E9bE253d3510ec9cCAdb';
  let errorMessage = '';
  let successMessage = '';
  let contractAddress = '';
  let contractApproved = true;
  let checked = false;
  let checksPending = false;
  let transferPending = false;
  let gasCalculation = [];
  let selectedStandard = 1;
  let gasPrice = 0;
  let gasLimit = 0;
  let si_gasLimit = 0;
  let tokenIds = [];
  let recipients = [];
  let isERC1155 = false;
  let tokenStandards = [
    { id: 1, text: 'ERC-721' },
    { id: 2, text: 'ERC-1155' }
  ]
  
  evm.attachContract('shipit', shipit, ShipIt.abi);

  function clearMessages() {
    gasCalculation = [];
    checked = false;
    checksPending = false;
    errorMessage = '';
    successMessage = '';
  }

  const approveShipIt = async () => {
    try {
      await $contracts.nft.methods.setApprovalForAll(shipit, true).send({from: $selectedAccount});
      contractApproved = true;
    } catch(e) {
      errorMessage = `Failed to approve contract: ${e.message}`;
      return;
    }
  }

  const isApproved = async () => {
    return await $contracts.nft.methods.isApprovedForAll($selectedAccount, shipit).call({from: $selectedAccount});
  }

  const performCheck = async () => {
    tokenIds = [];
    recipients = [];
    isERC1155 = false;
    checksPending = true;
    errorMessage = '';

    // Determine ABI
    if (selectedStandard == 1) {
      evm.attachContract('nft', contractAddress, IERC721.abi);
    } else {
      evm.attachContract('nft', contractAddress, IERC1155.abi);
      isERC1155 = true;
    }
    
    // Check the contract is valid
    try {
      $web3.utils.toChecksumAddress(contractAddress)
    } catch {
      errorMessage = 'Invalid contract address supplied';
      checksPending = false;
      return;
    }

    // Check textarea syntax
    let info = document.getElementById('recipientInfo').value;
    let lines = info.split(/(\s+)/);
    if (lines.length < 2) { errorMessage = 'Invalid recipient info; should be sending 2 or more tokens'; checksPending = false; return; }
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].split(',');
      if (line.length == 2) {
        let recipient = line[0];
        let tokenId = line[1];
        try {
          $web3.utils.toChecksumAddress(recipient);
          recipients.push(recipient);
        } catch {
          errorMessage = `Invalid recipient address supplied (line ${i + 1})`;
          checksPending = false;
          return;
        }

        // Check ownership of tokens
        if (selectedStandard == 1) {
          try {
            let owner = await $contracts.nft.methods.ownerOf(tokenId).call();
            if (owner.toLowerCase() != $selectedAccount.toLowerCase()) { throw new Error(`You must own the token in order to send it (token ${tokenId})`); }
            if (tokenIds.includes(tokenId)) { throw new Error(`Duplicate token ID found (token ${tokenId})`); }
            tokenIds.push(tokenId);
          } catch(e) {
            errorMessage = e;
            checksPending = false;
            return;
          }
        } else {
          try {
            let balance = await $contracts.nft.methods.balanceOf($selectedAccount, tokenId).call();
            if (Number(balance) < 1) { throw new Error(`You must own the token in order to send it (token ${tokenId}, balance ${balance})`); }
            if (Number(tokenIds.length) > Number(balance)) { throw new Error(`Provided more tokens than balance (token ${tokenId}, balance ${balance})`); }
            tokenIds.push(tokenId);
          } catch(e) {
            errorMessage = e;
            checksPending = false;
            return;
          }
        }

      }
    }
    
    // Check approval on the contract
    try {
      let approved = await $contracts.nft.methods.isApprovedForAll($selectedAccount, shipit).call();
      if (!approved) {
        errorMessage = 'ShipIt requires approval to bulk transfer tokens; click the "Approve" button to view gas estimations and savings';
        checksPending = false;
        contractApproved = false;
        return;
      }
    } catch {
      errorMessage = 'Unable to check contract approvals';
      checksPending = false;
      return;
    }

    // Show gas consumption forecasts
    await estimateGas();
    
    checked = true;
    window.scrollTo(0, document.body.scrollHeight);
  }

  function deriveTokenTotals() {
    const counts = {};
    let new_addr = [];
    let new_token = [];
    let new_amount = [];
    for (var i = 0; i < recipients.length; i++) {
      let x = recipients[i] + "_" + tokenIds[i];
      counts[x] = (counts[x] || 0) + 1;
    }
    for (const [key, value] of Object.entries(counts)) {
      new_addr.push(key.split('_')[0]);
      new_token.push(key.split('_')[1]);
      new_amount.push(value);
    }
    return {new_addr, new_token, new_amount}
  }

  async function estimateCBT() {
    si_gasLimit = 0;
    let fee = await $contracts.shipit.methods.usageFee().call();
    if (isERC1155) {
      let {new_addr, new_token, new_amount} = deriveTokenTotals();
      await $contracts.shipit.methods.erc1155BulkTransfer(contractAddress, new_addr, new_token, new_amount).estimateGas({from: $selectedAccount, value: fee * recipients.length}, function(err, gas){
        si_gasLimit += gas;
      });
    } else {
      await $contracts.shipit.methods.erc721BulkTransfer(contractAddress, recipients, tokenIds).estimateGas({from: $selectedAccount, value: fee * recipients.length}, function(err, gas){
        si_gasLimit += gas;
      });
    }
  }

  async function executeTransfer() {
    let fee = await $contracts.shipit.methods.usageFee().call();
    let res;
    transferPending = true;
    try {
      if (isERC1155) {
        let {new_addr, new_token, new_amount} = deriveTokenTotals();
        res = await $contracts.shipit.methods.erc1155BulkTransfer(contractAddress, new_addr, new_token, new_amount).send({
          from: $selectedAccount,
          value: fee * recipients.length,
          gasPrice: gasPrice,
          gas: si_gasLimit
        });
      } else {
        res = await $contracts.shipit.methods.erc721BulkTransfer(contractAddress, recipients, tokenIds).send({
          from: $selectedAccount,
          value: fee * recipients.length,
          gasPrice: gasPrice,
          gas: si_gasLimit
        });
      }
      if (res.status) {
        document.getElementById('recipientInfo').value = '';
        clearMessages();
        successMessage = `Success! tx ${res.transactionHash}`;
        window.scrollTo(0, document.body.scrollHeight);
      } else {
        throw new Error(`Transaction failed: ${res}`)
      }
    } catch(e) {
      errorMessage = `Failed to execute bulk transfer: ${e.message}`;
      transferPending = false;
    }
  }

  async function estimateSTF() {
    gasLimit = 0;
    if (isERC1155) {
      let {new_addr, new_token, new_amount} = deriveTokenTotals();
      for (let i = 0; i < new_addr.length; i++) {
        await $contracts.nft.methods.safeTransferFrom($selectedAccount, new_addr[i], new_token[i], new_amount[i], 0x0).estimateGas({from: $selectedAccount, gasPrice: gasPrice}, function(err, gas){
          gasLimit += gas;
        });
      }
    } else {
      for (let i = 0; i < recipients.length; i++) {
        await $contracts.nft.methods.safeTransferFrom($selectedAccount, recipients[i], tokenIds[i]).estimateGas({from: $selectedAccount, gasPrice: gasPrice}, function(err, gas){
          gasLimit += gas;
        });
      }
    }
  }

  async function estimateGas() {
    if (recipients.length != tokenIds.length) { errorMessage = 'Invalid recipient/token IDs provided; please review'; return; }
    gasPrice = await $web3.eth.getGasPrice();
    gasPrice = Math.round(gasPrice * 1.25);  // gentle nudge gwei
    await estimateCBT();
    await estimateSTF();
    let gasPriceGwei = await $web3.utils.fromWei(gasPrice.toString(), 'gwei');
    let gasCostWei = gasPrice * gasLimit;
    let gasCostEth = await $web3.utils.fromWei(gasCostWei.toString());
    let feeWei = await $contracts.shipit.methods.usageFee().call();
    let totalFeeWei = feeWei * recipients.length;
    let totalFeeEth = $web3.utils.fromWei(totalFeeWei.toString());
    let si_gasCostWei = gasPrice * si_gasLimit + totalFeeWei;
    let si_gasCostEth = await $web3.utils.fromWei(si_gasCostWei.toString());
    let diffWei = gasCostWei - si_gasCostWei;
    let diffEth = await $web3.utils.fromWei(diffWei.toString());
    let diffPerc = 100 - ((si_gasCostWei / gasCostWei) * 100);
    gasCalculation.push(`Current network gas price is ~${gasPriceGwei} gwei.`);
    gasCalculation.push(`Transferring ${recipients.length} tokens individually would cost ~${gasCostEth} Ξ (${gasLimit} gas).`);
    gasCalculation.push(`ShipIt can bulk transfer ${recipients.length} tokens for ${si_gasCostEth} Ξ (${si_gasLimit} gas + a small fee of ${totalFeeEth} Ξ).`);
    if (diffPerc < 0) {
      gasCalculation.push(`That is an additional cost of ${diffEth * -1} Ξ to transfer in one go to save you the time`);
    } else {
      gasCalculation.push(`That is a savings of ${diffEth} Ξ (saved ~${Math.round(diffPerc)}%)`);
    }
    gasCalculation = gasCalculation; // trigger recheck
  }

</script>



{#if $selectedAccount}
  <form>
    <div class="row">
      <div class="eight columns">
        <label for="contractAddress">Contract Address</label>
        <input class="u-full-width" type="text" placeholder="0x..." id="contractAddress" bind:value={contractAddress}>
      </div>
      <div class="four columns">
        <label for="tokenStandard">Token Standard</label>
        <select class="u-full-width" id="tokenStandard" bind:value={selectedStandard} on:change={clearMessages}>
          {#each tokenStandards as s}
            <option value={s.id}>
              {s.text}
            </option>
          {/each}
        </select>
      </div>
    </div>
    <label for="recipientInfo">Recipient Address, Token ID</label>
    <textarea class="u-full-width" style="height: 10em;" placeholder="0x653D2d1D10c79017b2eA5F5a6F02D9Ab6e725395,90
0x653D2d1D10c79017b2eA5F5a6F02D9Ab6e725395,1775" id="recipientInfo" on:change={clearMessages}></textarea>
    <br />
    {#if checked}
      <button class="button-primary" disabled={transferPending} on:click|preventDefault={executeTransfer}>
        {#if transferPending}executing...{:else}Transfer{/if}
      </button>
    {:else}
      <button class="button" disabled={checksPending} on:click|preventDefault={performCheck}>
        {#if checksPending}checking...{:else}Check{/if}
      </button>
    {/if}
    {#if !contractApproved}
      <button class="button-primary" on:click|preventDefault={approveShipIt}>Approve</button>
    {/if}
  </form>

  <ul>
    {#each gasCalculation as m, i}
      {#if i == 3}
        <li class="successMessage">{m}</li>
      {:else}
        <li>{m}</li>
      {/if}
    {/each}
  </ul>

  {#if errorMessage}
  <p class="errorMessage">{errorMessage}</p>
  {/if}

  {#if successMessage}
  <p class="successMessage">{successMessage}</p>
  {/if}
{/if}
<style>
  .errorMessage {
    color: red;
  }
  .successMessage {
    color: green;
  }
</style>