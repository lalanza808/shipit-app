<script>

  import { defaultEvmStores as evm, selectedAccount, contracts, web3 } from 'svelte-web3';
  import IERC721 from '@openzeppelin/contracts/build/contracts/IERC721.json';
  import IERC1155 from '@openzeppelin/contracts/build/contracts/IERC1155.json';
  import SendIt from './lib/sendit.json';

  const sendit = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  let errorMessage = '';
  let successMessage = '';
  let contractAddress = '';
  let contractApproved = true;
  let checked = false;
  let checksPending = false;
  let gasCalculation = [];
  let selectedStandard = 1;
  let tokenStandards = [
    { id: 1, text: 'ERC-721' },
    { id: 2, text: 'ERC-1155' }
  ]
  
  let gasLimit = 0;
  let si_gasLimit = 0;

  evm.attachContract('sendit', sendit, SendIt.abi);

  function clearMessages() {
    gasCalculation = [];
    checked = false;
    checksPending = false;
    errorMessage = '';
    successMessage = '';
  }

  const approveSendIt = async () => {
    await $contracts.nft.methods.setApprovalForAll(sendit, true).send({from: $selectedAccount});
  }

  const isApproved = async () => {
    return await $contracts.nft.methods.isApprovedForAll($selectedAccount, sendit).call({from: $selectedAccount});
    // if (!i) {
    //   await $contracts.nft.methods.setApprovalForAll(sendit, true).send({from: $selectedAccount});
    // }
  }

  const performCheck = async () => {
    let tokenIds = [];
    let recipients = [];
    let isERC1155 = false;
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
      let approved = await $contracts.nft.methods.isApprovedForAll($selectedAccount, sendit).call();
      if (!approved) {
        errorMessage = 'SendIt requires approval to bulk transfer tokens; click the "Approve" button below';
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
    await estimateGas(recipients, tokenIds, isERC1155);
    
    checked = true;
  }

  async function estimateCBT(recipients, tokens, isERC1155) {
    si_gasLimit = 0;
    let fee = await $contracts.sendit.methods.usageFee().call();
    console.log(recipients)
    console.log(tokens)
    await $contracts.sendit.methods.contractBulkTransfer(contractAddress, tokens, recipients, isERC1155).estimateGas({from: $selectedAccount, value: fee * recipients.length}, function(err, gas){
      si_gasLimit += gas;
    });
  }

  async function estimateSTF(recipients, tokens, isERC1155) {
    gasLimit = 0;
    for (let i = 0; i < recipients.length; i++) {
      if (isERC1155) {
        await $contracts.nft.methods.safeTransferFrom($selectedAccount, recipients[i], tokens[i], 1, "").estimateGas({from: $selectedAccount}, function(err, gas){
          gasLimit += gas;
        });
      } else {
        await $contracts.nft.methods.safeTransferFrom($selectedAccount, recipients[i], tokens[i]).estimateGas({from: $selectedAccount}, function(err, gas){
          gasLimit += gas;
        });
      }
    }
  }

  async function estimateGas(recipients, tokens, isERC1155) {
    if (recipients.length != tokens.length) { errorMessage = 'Invalid recipient/token IDs provided; please review'; return; }
    await estimateCBT(recipients, tokens, isERC1155);
    await estimateSTF(recipients, tokens, isERC1155);
    let gasPrice = await $web3.eth.getGasPrice();
    // let gasPrice = 50000000000; // override for testing
    let gasPriceGwei = await $web3.utils.fromWei(gasPrice.toString(), 'gwei');
    let gasCostWei = gasPrice * gasLimit;
    let gasCostEth = await $web3.utils.fromWei(gasCostWei.toString());
    let feeWei = await $contracts.sendit.methods.usageFee().call();
    let totalFeeWei = feeWei * recipients.length;
    let totalFeeEth = $web3.utils.fromWei(totalFeeWei.toString());
    let si_gasCostWei = gasPrice * si_gasLimit + totalFeeWei;
    let si_gasCostEth = await $web3.utils.fromWei(si_gasCostWei.toString());
    let diffWei = gasCostWei - si_gasCostWei;
    let diffEth = await $web3.utils.fromWei(diffWei.toString());
    let diffPerc = 100 - ((si_gasCostWei / gasCostWei) * 100);
    gasCalculation.push(`Current network gas price is ~${gasPriceGwei} gwei.`);
    gasCalculation.push(`Transferring ${recipients.length} tokens individually would cost ~${gasCostEth} Ξ (${gasLimit} gas).`);
    gasCalculation.push(`SendIt can bulk transfer ${recipients.length} tokens for ${si_gasCostEth} Ξ (${si_gasLimit} gas + a small fee of ${totalFeeEth} Ξ).`);
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
    <div class="ten columns">
      <label for="contractAddress">Contract Address</label>
      <input class="u-full-width" type="text" placeholder="0x..." id="contractAddress" bind:value={contractAddress}>
    </div>
    <div class="two columns">
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
    <input class="button-primary" type="submit" value="Transfer">
  {:else}
    <button class="button" disabled={checksPending} on:click|preventDefault={performCheck}>
      {#if checksPending}checking...{:else}Check{/if}
    </button>
  {/if}
  {#if !contractApproved}
    <button class="button-primary" on:click|preventDefault={approveSendIt}>Approve</button>
  {/if}
</form>
{/if}

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

{#if errorMessage}
<p class="successMessage">{successMessage}</p>
{/if}

<style>
  .errorMessage {
    color: red;
  }
  .successMessage {
    color: green;
  }
</style>