<script>
  import Icon from '@iconify/svelte';
  import { saveAs } from 'file-saver';
  import { onMount, createEventDispatcher } from 'svelte';

  import {
    mode,
    globalAttributes,
    renderSvg,
    addAttribute,
    isSnapEnabled,
    snapRadius
  } from '$lib/stores.js';

  // export let polygons;
  export let selectedPolygon;

  const dispatch = createEventDispatcher();

  let toolbarEl;
  let x;
  let y;
  let isDragging = false;
  let newAttributeName = '';
  let newAttributeValue = '';
  let newAttributeIsGlobal = true;

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
    const blob = new Blob([$renderSvg.outerHTML], { type: 'image/svg+xml' });
    saveAs(blob, 'graph.svg');
  };

  const handleAttributeAddClick = () => {
    const attributeToAdd = {
      name: newAttributeName,
      value: newAttributeValue
    };
    dispatch('add-attribute', attributeToAdd);
    if (newAttributeIsGlobal) {
      addAttribute(attributeToAdd);
    }
    newAttributeName = '';
    newAttributeValue = '';
  };

  const handleValueInput = (e, attribute) => {
    dispatch('attribute-value-input', {
      name: attribute.name,
      value: e.target.value
    });
  };

  onMount(() => {
    const clientRect = toolbarEl.getBoundingClientRect();
    x = clientRect.x;
    y = clientRect.y;
  });

  $: style = `left:${x}px;top:${y}px`;
  $: selectedPolygonAttributes =
    selectedPolygon &&
    Object.entries(selectedPolygon.attributes).reduce(
      (acc, [name, value]) => [...acc, { name, value }],
      []
    );
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
  <input
    type="checkbox"
    value={$isSnapEnabled}
    on:input={(e) => isSnapEnabled.set(!!e.target.checked)}
  />
  <input
    type="range"
    min="1"
    max="50"
    value={$snapRadius}
    disabled={!$isSnapEnabled}
    on:input={(e) => snapRadius.set(e.target.value)}
  />
  Selected polygon id: {selectedPolygon?.id}
  <div class="attributes">
    ========= GLOBAL ATTRIBUTES =========
    {#each Object.entries($globalAttributes) as [name, value], i}
      <div class="attributes__row">
        {name}: {value}
      </div>
    {/each}
    {#if selectedPolygon}
      ========= COMPONENT ATTRIBUTES =========
      {#each selectedPolygonAttributes as attribute, i}
        <div class="attributes__row">
          {attribute.name}:
          <input
            type="text"
            class="attributes__input"
            value={attribute.value}
            on:input={(e) => handleValueInput(e, attribute)}
          />
        </div>
      {/each}
      ========= ADD NEW (COMPONENT) ATTRIBUTE =========
      <div class="attributes__row">
        <input type="text" class="attributes__input" bind:value={newAttributeName} />
        <input type="text" class="attributes__input" bind:value={newAttributeValue} />
        <input type="checkbox" bind:checked={newAttributeIsGlobal} />global?
      </div>
      <button class="attributes__submit" on:click={handleAttributeAddClick}>add</button>
      <button class="attributes__submit">apply to all</button>
    {/if}
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
