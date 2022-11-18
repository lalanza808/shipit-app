<script>

  import { defaultEvmStores as evm, selectedAccount, contracts, web3 } from 'svelte-web3';
  import IERC721 from '@openzeppelin/contracts/build/contracts/IERC721.json';
  import IERC1155 from '@openzeppelin/contracts/build/contracts/IERC1155.json';
  import SendIt from './lib/sendit.json';

  let errorMessage = '';
  let successMessage = '';
  let contractAddress = '';
  let contractApproved = false;
  let checked = false;
  let selectedStandard = 1;
  let tokenStandards = [
    { id: 1, text: 'ERC-721' },
    { id: 2, text: 'ERC-1155' }
  ]
  
  // 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
  const sendit = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
  // const to = '0x7c83E906aDD18C093B4B01ED40b6BCb25d348ED9';
  
  let amt = 10;
  let gasLimit = 0;
  let si_gasLimit = 0;

  // evm.attachContract('nft', contractAddress, IERC721.abi);
  // evm.attachContract('sendit', sendit, SendIt.abi);

  const performCheck = async () => {
    let tokenIds = [];
    errorMessage = '';

    // Check the contract is valid
    try {
      $web3.utils.toChecksumAddress(contractAddress)
    } catch {
      errorMessage = 'Invalid contract address supplied';
      return;
    }
    // Check approval on the contract
    if (selectedStandard == 1) {
      evm.attachContract('nft', contractAddress, IERC721.abi);
    } else {
      evm.attachContract('nft', contractAddress, IERC1155.abi);
    }
    try {
      let r = await $contracts.nft.methods.isApprovedForAll($selectedAccount, sendit);
      console.log(r);
    } catch {
      errorMessage = 'Unable to check contract approvals';
      return;
    }

    // Check textarea syntax
    let info = document.getElementById('recipientInfo').value;
    let lines = info.split(/(\s+)/);
    console.log(lines);
    if (lines.length < 2) { errorMessage = 'Invalid recipient info.'; return; }
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].split(',');
      if (line.length == 2) {
        let recipient = line[0];
        let tokenId = line[1];
        try {
          $web3.utils.toChecksumAddress(recipient)
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
    
    // Check gas consumption forecasts
    // Show results
  }

  // const estimateCBT = async () => {
  //   si_gasLimit = 0;
  //   let tokenIndexes = [];
  //   let recipients = [];
  //   for (let i = 0; i < amt; i++) {
  //       tokenIndexes[i] = i + 1;
  //       recipients[i] = to;
  //   }
  //   let i = await $contracts.nft.methods.isApprovedForAll($selectedAccount, sendit).call({from: $selectedAccount});
  //   if (!i) {
  //     await $contracts.nft.methods.setApprovalForAll(sendit, true).send({from: $selectedAccount});
  //   }
  //   await $contracts.sendit.methods.contractBulkTransfer(nft, tokenIndexes, recipients, false).estimateGas({from: $selectedAccount}, function(err, gas){
  //     si_gasLimit += gas;
  //   });
  // }

  // const estimateSTF = async () => {
  //   gasLimit = 0;
  //   for (let i = 0; i < amt; i++) {
  //     await $contracts.nft.methods.safeTransferFrom($selectedAccount, to, i + 1).estimateGas({from: $selectedAccount}, function(err, gas){
  //       gasLimit += gas;
  //     });
  //   }
  // }

  // function estimateGas() {
  //   estimateCBT();
  //   estimateSTF();
  // }

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
</form>
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