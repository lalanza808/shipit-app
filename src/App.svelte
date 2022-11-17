<script>
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from './assets/vitejs.svg'
  import ethereumLogo from './assets/ethereum.svg'
  import Providers from './Providers.svelte';
  import Contracts from './Contracts.svelte';
</script>

<main>

  <div>
    <a href="https://vitejs.dev" target="_blank"> 
      <img src="{viteLogo}" class="logo" alt="Vite Logo" />
    </a>
    <a href="https://svelte.dev" target="_blank"> 
      <img src={svelteLogo} class="logo svelte" alt="Svelte Logo" />
    </a>
    <a href="https://web3js.readthedocs.io/" target="_blank">
      <img src={ethereumLogo} class="logo ethereum" alt="Ethereum Logo" />
    </a>
  </div>
  <h1>Vite + Svelte + web3.js</h1>

  <div class="card">
    <Providers />
  </div>

  <Contracts />

</main>

<style>
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
  .logo.ethereum:hover {
    filter: drop-shadow(0 0 2em #343434aa);
  }
  .read-the-docs {
    color: #888;
  }
</style>
