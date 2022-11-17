<script>
  import { defaultEvmStores as evm, connected, evmProviderType, selectedAccount, chainId, chainData } from 'svelte-web3';

  let type;
  let pending = false;

  const connect = async () => {
    pending = true
    try {
      await evm.setProvider()
      pending = false
    } catch(e) {
      console.log(e)
      pending = false
    }
  }

  const disconnect = async () => {
    await evm.disconnect()
    pending = false
  }
</script>


<div class="contentz">
  {#if !$selectedAccount}
    <button class="button" disabled={pending} on:click={connect}>{#if pending}connecting...{:else}Connect{/if}</button>
  {:else}
    <p>
    You are now connected to the blockchain (account {$selectedAccount})
    </p>
    <button class="button" on:click={disconnect}>Disconnect</button>
    <h2>Current stores values:</h2>
    <ul>
      <li>$connected: {$connected}</li>
      <li>$chainId: {$chainId}</li>
      <li>$evmProviderType: {$evmProviderType}</li>
      <li>$selectedAccount: {$selectedAccount}</li>
      <li>$chainData: {$chainData}</li>
    </ul>
  {/if}
</div>

<style>
  ul li {
    list-style: none;
    text-align: left;
  }
  ul li:before {
    content: "=> ";
  }
</style>
