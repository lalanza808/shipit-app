<script>

  import { defaultEvmStores as evm, selectedAccount, chainId, contracts } from 'svelte-web3';
  import IERC721 from '@openzeppelin/contracts/build/contracts/IERC721.json';
  import SendIt from './lib/sendit.json';

  const nft = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
  const sendit = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
  const customChain = {
    customChain: {
      networkId: $chainId, 
      chainId: $chainId
    }
  }
  let gasLimit = 0;
  let si_gasLimit = 0;

  evm.attachContract('nft', nft, IERC721.abi);
  evm.attachContract('sendit', sendit, SendIt.abi);

  const estimateCBT = async () => {
    si_gasLimit = 0;
    let tokenIndexes = [];
    let recipients = [];
    for (let i = 0; i < 10; i++) {
        tokenIndexes[i] = i + 1;
        recipients[i] = '0x653D2d1D10c79017b2eA5F5a6F02D9Ab6e725395';
    }
    let i = await $contracts.nft.methods.isApprovedForAll($selectedAccount, sendit).call();
    if (!i) {
      await $contracts.nft.methods.setApprovalForAll(sendit, true).send({
        from: $selectedAccount,
        chainId: $chainId,
        
      });
    }
    await $contracts.sendit.methods.contractBulkTransfer(nft, tokenIndexes, recipients, false).estimateGas({from: $selectedAccount, common: customChain}, function(err, gas){
      si_gasLimit += gas;
    });
  }

  const estimateSTF = async () => {
    gasLimit = 0;
    for (let i = 0; i < 10; i++) {
      await $contracts.nft.methods.safeTransferFrom($selectedAccount, '0x653D2d1D10c79017b2eA5F5a6F02D9Ab6e725395', i + 1).estimateGas({from: $selectedAccount}, function(err, gas){
        gasLimit += gas;
      });
    }
  }

  function estimateGas() {
    estimateCBT();
    estimateSTF();
  }

</script>


<div class="content">
  {#if $selectedAccount }
    {#if $chainId !== 1337 }
      <p>
        Your are connected to the wrong network.
      </p>
    {:else if $contracts.nft}
      {#await $contracts.nft.methods.balanceOf($selectedAccount).call() }
        <span>checking balance...</span>
      {:then balance}
        <p>
          Gas Required to send 10 NFTs via OpenZeppelin ERC721 safeTransferFrom: {gasLimit}
          <br />
          Gas Required to send 10 NFTs via SendIt ERC721 contractBulkTransfer: {si_gasLimit}
          <br />
          {$selectedAccount} has {balance} NFTs on local net (anvil).
        </p>
        <button class="button" on:click={estimateGas}>Test</button>
      {/await}
    {/if}
  {:else}
    <p>
      Please first connect your wallet to be able to use this page.
    </p>
  {/if}

</div>
