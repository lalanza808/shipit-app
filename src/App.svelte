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
      <div class="column" style="margin-top: 4em;">
        <img src={ethereumLogo} class="logo ethereum" alt="Ethereum Logo" width=50em />
        <h1>ShipIt!</h1>
        <p>
          A bulk NFT transfer utility made for transferring ERC-721 and ERC-1155 tokens between wallets very efficiently. 
          <br />
          Use it to vault your NFTs en masse or to distribute tokens to a large audience for some major gas savings. 
          <br />
          <br />
          Made by <a href="https://twitter.com/lza_menace" target="_blank" rel="noreferrer">lza_menace</a> of the <a href="https://art101.io" target="_blank" rel="noreferrer">Art101</a> team. 
          <br />
          <a href="https://etherscan.io/address/0x76Ae5B6E75F6e05BcaD1028F78A83f974fc96A8B/" target="_blank" rel="noreferrer">
            Etherscan.
          </a>
          <a href="https://github.com/lalanza808/shipit-app" rel="noreferrer" target="_blank">
            Github (app).
          </a>
          <a href="https://github.com/lalanza808/shipit" rel="noreferrer" target="_blank">
            Github (contract).
          </a>
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
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.ethereum:hover {
    filter: drop-shadow(0 0 2em #343434aa);
  }
</style>
