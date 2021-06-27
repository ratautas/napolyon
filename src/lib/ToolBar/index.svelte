<script>
  import Icon from '@iconify/svelte';
  import { saveAs } from 'file-saver';
  import { onMount } from 'svelte';

  import { mode, svgState } from '$lib/stores.js';

  let toolbarEl;
  let x;
  let y;
  let isDragging = false;

  const handleMousemove = (e) => {
    if (!isDragging) return;
    const { movementX, movementY } = e;
    x += movementX;
    y += movementY;
  };

  const handleAddClick = (e, targetMode) => {
    e.stopPropagation();
    mode.set($mode !== targetMode ? targetMode : null);
  };

  const handleDowloadClick = () => {
    const blob = new Blob([$svgState.outerHTML], { type: 'image/svg+xml' });
    saveAs(blob, 'graph.svg');
  };

  onMount(() => {
    const clientRect = toolbarEl.getBoundingClientRect();
    x = clientRect.x;
    y = clientRect.y;
  });

  $: style = `left:${x}px;top:${y}px`;
</script>

<div class="toolbar" {style} bind:this={toolbarEl}>
  <div
    class="handle"
    on:mousemove={handleMousemove}
    on:mousedown={() => (isDragging = true)}
    on:mouseup={() => (isDragging = false)}
    on:mouseleave={() => (isDragging = false)}
  >
    <Icon icon="ph:dots-nine-thin" width="32" height="32" />
  </div>
  <div class="tools">
    <div
      class="tool"
      class:is-selected={$mode === 'draw'}
      on:click={(e) => handleAddClick(e, 'draw')}
    >
      <Icon color="currentColor" icon="ph:share-network" width="32" height="32" />
    </div>
    <div class="tool" on:click={handleDowloadClick}>
      <Icon color="currentColor" icon="ph:download-simple" width="32" height="32" />
    </div>
  </div>
  <Icon icon="ph:anchor" width="8" height="8" />
  <Icon icon="ph:activity" width="8" height="8" />
  <Icon icon="ph:archive-box" width="8" height="8" />
  <Icon icon="ph:cursor" width="8" height="8" />
  <Icon icon="ph:flag" width="8" height="8" />
  <Icon icon="ph:git-diff" width="8" height="8" />
  <Icon icon="ph:intersect" width="8" height="8" />
  <Icon icon="ph:knife" width="8" height="8" />
  <Icon icon="ph:path" width="8" height="8" />
  <Icon icon="ph:pen" width="8" height="8" />
  <Icon icon="ph:pen-nib" width="8" height="8" />
  <Icon icon="ph:pen-nib-straight" width="8" height="8" />
  <Icon icon="ph:pencil" width="8" height="8" />
  <Icon icon="ph:pencil-simple" width="8" height="8" />
  <Icon icon="ph:plus" width="8" height="8" />
  <Icon icon="ph:plus-minus" width="8" height="8" />
  <Icon icon="ph:share-network" width="8" height="8" />
</div>

<style lang="scss">
</style>
