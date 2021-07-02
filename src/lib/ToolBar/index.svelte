<script>
  import Accordion from 'carbon-components-svelte/src/Accordion/Accordion.svelte';
  import AccordionItem from 'carbon-components-svelte/src/Accordion/AccordionItem.svelte';
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';
  import CodeSnippet from 'carbon-components-svelte/src/CodeSnippet/CodeSnippet.svelte';
  import TextInput from 'carbon-components-svelte/src/TextInput/TextInput.svelte';
  import Toggle from 'carbon-components-svelte/src/Toggle/Toggle.svelte';
  import Slider from 'carbon-components-svelte/src/Slider/Slider.svelte';

  import Switcher24 from 'carbon-icons-svelte/lib/Switcher24';
  import { saveAs } from 'file-saver';
  import { onMount } from 'svelte';

  import {
    mode,
    globalAttributes,
    renderSvg,
    addAttribute,
    isSnapEnabled,
    selectedPolygon,
    snapRadius,
    polygons
  } from '$lib/stores.js';

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

    polygons.addAttribute($selectedPolygon, attributeToAdd);

    if (newAttributeIsGlobal) {
      addAttribute(attributeToAdd);
    }

    newAttributeName = '';
    newAttributeValue = '';
  };

  onMount(() => {
    const clientRect = toolbarEl.getBoundingClientRect();
    x = clientRect.x;
    y = clientRect.y;
  });

  $: style = `left:${x}px;top:${y}px`;
  $: selectedPolygonAttributes =
    $selectedPolygon &&
    Object.entries($selectedPolygon.attributes).reduce(
      (acc, [name, value]) => [...acc, { name, value }],
      []
    );
  $: cssString = Object.entries($globalAttributes).reduce(
    (acc, [name, value]) => `${acc}\t${name}: ${value};\n`,
    ''
  );
  $: cssCode = `polygon {\n${cssString}}`;
</script>

<div class="toolbar" {style} bind:this={toolbarEl}>
  <!-- TODO: replace it with drag pattern -->
  <div
    class="handle"
    on:mousemove={handleMousemove}
    on:mousedown={() => (isDragging = true)}
    on:mouseup={() => (isDragging = false)}
    on:mouseleave={() => (isDragging = false)}
  >
    <Button
      kind="ghost"
      tooltipPosition="bottom"
      tooltipAlignment="center"
      iconDescription="Drag Toolbar"
      icon={Switcher24}
    />
    {$selectedPolygon?.id}
  </div>
  <div class="tools">
    <div
      class="tool"
      class:is-selected={$mode === 'draw'}
      on:click={(e) => handleAddClick(e, 'draw')}
    >
      <!-- <Icon color="currentColor" icon="ph:share-network" width="32" height="32" /> -->
    </div>
    <div class="tool" on:click={handleDowloadClick}>
      <!-- <Icon color="currentColor" icon="ph:download-simple" width="32" height="32" /> -->
    </div>
  </div>
  <Accordion>
    <AccordionItem title="Snap to Points">
      <div class="snap">
        <div class="snap__toggle">
          <Toggle labelA="" labelB="" hideLabel bind:toggled={$isSnapEnabled} />
        </div>
        <Slider
          light
          min={2}
          max={50}
          hideTextInput
          labelText="Snap Radius"
          bind:value={$snapRadius}
          disabled={!$isSnapEnabled}
        />
      </div>
    </AccordionItem>
    <AccordionItem title="CSS Code">
      <div class="">
        <CodeSnippet type="multi" code={cssCode} />
      </div>
    </AccordionItem>
  </Accordion>
  <div class="attributes">
    {#if $selectedPolygon && false}
      {#each selectedPolygonAttributes as attribute, i}
        <TextInput
          inline
          light
          required
          size="sm"
          labelText={attribute.name}
          bind:value={$polygons[$selectedPolygon.id].attributes[attribute.name]}
        />
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
</div>
