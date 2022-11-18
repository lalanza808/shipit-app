<script>
  import svelteLogo from './assets/svelte.svg'
  import viteLogo from './assets/vitejs.svg'
  import ethereumLogo from './assets/ethereum.svg'
  import Providers from './Providers.svelte';
  import Contracts from './Contracts.svelte';
</script>

<main>
  <div class="container">
    <div class="row">
      <div class="column">
        <img src={ethereumLogo} class="logo ethereum" alt="Ethereum Logo" />
        <h1>SendIt!</h1>
        <p>
          A bulk NFT transfer utility made for transferring ERC-721 and ERC-1155 tokens between accounts easily.
          <br />
          Made by <a href="https://lzahq.tech" target="_blank" rel="noreferrer">lza_menace</a> and the <a href="https://art101.io" target="_blank" rel="noreferrer">Art101</a> team.
        </p>
        <Providers />
      </div>
    </div>
    <div class="row">
      <div class="column">
        <Contracts />
      </div>
    </div>
  </div>
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
  .logo.ethereum:hover {
    filter: drop-shadow(0 0 2em #343434aa);
  }
</style>
