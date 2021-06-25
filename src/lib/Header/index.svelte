<script>
  import { page } from '$app/stores';
  import logo from './svelte-logo.svg';
</script>

<header>
  <nav>
    <ul>
      <li class:active={$page.path === '/'}><a sveltekit:prefetch href="/">Home</a></li>
      <li class:active={$page.path === '/about'}><a sveltekit:prefetch href="/about">About</a></li>
    </ul>
  </nav>
</header>

<style>
</style>
