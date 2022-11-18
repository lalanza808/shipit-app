<script>
  import { defaultEvmStores as evm, selectedAccount } from 'svelte-web3';

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

<div class="container">
  <div class="row">
    <div class="column mt-2">
      {#if !$selectedAccount}
        <button class="button" disabled={pending} on:click={connect}>{#if pending}connecting...{:else}Connect{/if}</button>
      {:else}
        <p>
          Connected {$selectedAccount}
        </p>
        <button class="button" on:click={disconnect}>Disconnect</button>
      {/if}
    </div>
  </div>
</div>
