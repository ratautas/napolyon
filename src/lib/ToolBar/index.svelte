<script>
  import Accordion from 'carbon-components-svelte/src/Accordion/Accordion.svelte';
  import AccordionItem from 'carbon-components-svelte/src/Accordion/AccordionItem.svelte';
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';
  import CodeSnippet from 'carbon-components-svelte/src/CodeSnippet/CodeSnippet.svelte';
  import TextInput from 'carbon-components-svelte/src/TextInput/TextInput.svelte';
  import Toggle from 'carbon-components-svelte/src/Toggle/Toggle.svelte';
  import Slider from 'carbon-components-svelte/src/Slider/Slider.svelte';

  import AreaCustom24 from 'carbon-icons-svelte/lib/AreaCustom24';
  import CloudDownload24 from 'carbon-icons-svelte/lib/CloudDownload24';
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
    selectedPolygonId,
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
    $selectedPolygon.attributes &&
    Object.entries($selectedPolygon.attributes).reduce(
      (acc, [name, value]) => [...acc, { name, value }],
      []
    );
  $: globalCssString = Object.entries($globalAttributes).reduce(
    (acc, [name, value]) => `${acc}  ${name}: ${value};\n`,
    ''
  );
  $: globalCssRender = `polygon {\n${globalCssString}}`;
</script>

<div class="toolbar" {style} bind:this={toolbarEl}>
  <!-- TODO: replace it with drag pattern -->
  <div class="buttons">
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
        iconDescription="Click & Drag Toolbar"
        icon={Switcher24}
      />
    </div>
    <Button
      kind="ghost"
      tooltipPosition="bottom"
      tooltipAlignment="center"
      iconDescription="Add New Polygon"
      icon={AreaCustom24}
      isSelected={$mode === 'draw'}
      on:click={(e) => handleAddClick(e, 'draw')}
    />
    <Button
      kind="ghost"
      tooltipPosition="bottom"
      tooltipAlignment="center"
      iconDescription="Download SVG File"
      icon={CloudDownload24}
      on:click={handleDowloadClick}
    />
  </div>
  <Accordion>
    <AccordionItem>
      <svelte:fragment slot="title">
        Snap to other points: {$isSnapEnabled ? 'ON' : 'OFF'}
      </svelte:fragment>
      <div class="snap">
        <Toggle class="snap__toggle" labelA="" labelB="" bind:toggled={$isSnapEnabled} />
        <Slider
          disabled={!$isSnapEnabled}
          hideTextInput
          labelText="Radius -- select a polygon for preview"
          light
          max={100}
          min={1}
          bind:value={$snapRadius}
        />
      </div>
    </AccordionItem>
    <!-- <AccordionItem title="CSS Code">
      <CodeSnippet class="code" type="multi" code={globalCssRender} />
    </AccordionItem> -->
    <AccordionItem title="Polygon Attributes" disabled={!$selectedPolygonId}>
      {#if $selectedPolygonId && selectedPolygonAttributes}
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
      {/if}
      ========= ADD NEW (COMPONENT) ATTRIBUTE =========
      <div class="attributes__row">
        <input type="text" class="attributes__input" bind:value={newAttributeName} />
        <input type="text" class="attributes__input" bind:value={newAttributeValue} />
        <input type="checkbox" bind:checked={newAttributeIsGlobal} />global?
      </div>
      <button class="attributes__submit" on:click={handleAttributeAddClick}>add</button>
      <button class="attributes__submit">apply to all</button>
    </AccordionItem>
  </Accordion>
</div>
