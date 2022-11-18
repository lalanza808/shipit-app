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
  let gasCalculation = '';
  let selectedStandard = 1;
  let tokenStandards = [
    { id: 1, text: 'ERC-721' },
    { id: 2, text: 'ERC-1155' }
  ]
  
  let amt = 10;
  let gasLimit = 0;
  let si_gasLimit = 0;

  evm.attachContract('sendit', sendit, SendIt.abi);

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
    errorMessage = '';

    // Determine ABI
    if (selectedStandard == 1) {
      evm.attachContract('nft', contractAddress, IERC721.abi);
    } else {
      evm.attachContract('nft', contractAddress, IERC1155.abi);
    }
    
    // Check the contract is valid
    try {
      $web3.utils.toChecksumAddress(contractAddress)
    } catch {
      errorMessage = 'Invalid contract address supplied';
      return;
    }

    // Check textarea syntax
    let info = document.getElementById('recipientInfo').value;
    let lines = info.split(/(\s+)/);
    if (lines.length < 2) { errorMessage = 'Invalid recipient info.'; return; }
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
            return;
          }
        } else {
          try {
            let balance = await $contracts.nft.methods.balanceOf($selectedAccount, tokenId).call();
            if (Number(balance) < 1) { throw new Error(`You must own the token in order to send it (token ${tokenId}, balance ${balance})`); }
            if (tokenIds.length < Number(balance)) { throw new Error(`Provided more tokens than balance(token ${tokenId}, balance ${balance})`); }
            tokenIds.push(tokenId);
          } catch(e) {
            errorMessage = e;
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
        contractApproved = false;
        return;
      }
    } catch {
      errorMessage = 'Unable to check contract approvals';
      return;
    }

    // Check gas consumption forecasts
    await estimateGas(recipients, tokenIds);
    
    // Show results
  }

  async function estimateCBT(recipients, tokens) {
    si_gasLimit = 0;
    let fee = await $contracts.sendit.methods.usageFee().call();
    await $contracts.sendit.methods.contractBulkTransfer(contractAddress, tokens, recipients, false).estimateGas({from: $selectedAccount, value: fee * recipients.length}, function(err, gas){
      si_gasLimit += gas;
    });
  }

  async function estimateSTF(recipients, tokens) {
    gasLimit = 0;
    for (let i = 0; i < recipients.length; i++) {
      await $contracts.nft.methods.safeTransferFrom($selectedAccount, recipients[i], tokens[i]).estimateGas({from: $selectedAccount}, function(err, gas){
        gasLimit += gas;
      });
    }
  }

  async function estimateGas(recipients, tokens) {
    if (recipients.length != tokens.length) { errorMessage = 'Invalid recipient/token IDs provided; please review'; return; }
    await estimateCBT(recipients, tokens);
    await estimateSTF(recipients, tokens);
    // let gasPrice = await $web3.eth.getGasPrice();
    let gasPrice = 20000000000;
    let gasCostEth = await $web3.utils.fromWei((gasPrice * gasLimit).toString());
    let feeWei = await $contracts.sendit.methods.usageFee().call();
    let totalFeeWei = feeWei * recipients.length;
    let si_gasCostWei = gasPrice * si_gasLimit + totalFeeWei;
    let si_gasCostEth = await $web3.utils.fromWei(si_gasCostWei.toString());
    gasCalculation = `Transferring each token individual would require ${gasLimit} gas (${gasCostEth} Ξ). SendIt can do it for ${si_gasLimit} gas + a fee (${si_gasCostEth} Ξ).`;
  }

</script>



{#if $selectedAccount}
<form>
  <div class="row">
    <div class="six columns">
      <label for="contractAddress">Contract Address</label>
      <input class="u-full-width" type="text" placeholder="0x..." id="contractAddress" bind:value={contractAddress}>
    </div>
    <div class="six columns">
      <label for="tokenStandard">Token Standard</label>
      <select class="u-full-width" id="tokenStandard" bind:value={selectedStandard} on:change="{() => checked = false}">
        {#each tokenStandards as s}
          <option value={s.id}>
            {s.text}
          </option>
        {/each}
      </select>
    </div>
  </div>
  <label for="recipientInfo">Recipient Address, Token ID</label>
  <textarea class="u-full-width" placeholder="0x653D2d1D10c79017b2eA5F5a6F02D9Ab6e725395,90
0x653D2d1D10c79017b2eA5F5a6F02D9Ab6e725395,1775" id="recipientInfo"></textarea>
  <br />
  {#if checked}
    <input class="button-primary" type="submit" value="Transfer">
  {:else}
    <input class="button" type="submit" value="Check" on:click|preventDefault={performCheck}>
  {/if}
  {#if !contractApproved}
    <button class="button-primary" on:click|preventDefault={approveSendIt}>Approve</button>
  {/if}
</form>
{/if}

{#if gasCalculation}
  <p>{gasCalculation}</p>
{/if}

{#if errorMessage}
<p id="errorMessage">{errorMessage}</p>
{/if}

{#if errorMessage}
<p id="successMessage">{successMessage}</p>
{/if}

<style>
  #errorMessage {
    color: red;
  }
  #successMessage {
    color: green;
  }
</style>