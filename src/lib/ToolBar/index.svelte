<script>
  import Accordion from 'carbon-components-svelte/src/Accordion/Accordion.svelte';
  import AccordionItem from 'carbon-components-svelte/src/Accordion/AccordionItem.svelte';
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';
  import CodeSnippet from 'carbon-components-svelte/src/CodeSnippet/CodeSnippet.svelte';
  import TextInput from 'carbon-components-svelte/src/TextInput/TextInput.svelte';
  import Toggle from 'carbon-components-svelte/src/Toggle/Toggle.svelte';
  import Slider from 'carbon-components-svelte/src/Slider/Slider.svelte';
  import Form from 'carbon-components-svelte/src/Form/Form.svelte';

  import TrashCan16 from 'carbon-icons-svelte/lib/TrashCan16';
  import AreaCustom24 from 'carbon-icons-svelte/lib/AreaCustom24';
  import CloudDownload24 from 'carbon-icons-svelte/lib/CloudDownload24';
  import Switcher24 from 'carbon-icons-svelte/lib/Switcher24';
  import CopyFile24 from 'carbon-icons-svelte/lib/CopyFile24';
  import { saveAs } from 'file-saver';
  import { onMount } from 'svelte';

  import ToolBarButtons from '$lib/ToolBar/ToolBarButtons.svelte';

  import {
    mode,
    renderSvg,
    isSnapEnabled,
    selectedPolygon,
    selectedPolygonId,
    hoveredPolygonId,
    snapRadius,
    polygons,
    globalAttributes
  } from '$lib/stores.js';

  let toolbarEl;
  let x;
  let y;
  let isDragging = false;
  let newAttributeName = '';
  let newAttributeValue = '';
  let isNewAttributeGlobal = true;

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

  const handleCopyClick = async () => {
    selectedPolygonId.set(null);
    hoveredPolygonId.set(null);
    await navigator.clipboard.writeText($renderSvg.outerHTML);
  };

  const handleDowloadClick = () => {
    selectedPolygonId.set(null);
    hoveredPolygonId.set(null);
    // $renderSvg.removeAttribute('class');
    const blob = new Blob([$renderSvg.outerHTML], { type: 'image/svg+xml' });
    saveAs(blob, 'graph.svg');
  };

  const handleaddLocalAttributeSubmit = () => {
    const attributeToAdd = {
      name: newAttributeName,
      value: newAttributeValue
    };

    console.log($selectedPolygonId);

    if (isNewAttributeGlobal) {
      polygons.addGlobalAttribute(attributeToAdd);
      globalAttributes.add(attributeToAdd);
    } else {
      polygons.addLocalAttribute($selectedPolygonId, attributeToAdd);
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
  // $: globalCssString = $globalAttributesMap.reduce(
  //   (acc, [name, value]) => `${acc}  ${name}: ${value};\n`,
  //   ''
  // );
  // $: globalCssRender = `polygon {\n${globalCssString}}`;
</script>

<div class="toolbar" {style} bind:this={toolbarEl}>
  <!-- TODO: replace it with drag pattern -->
  <ToolBarButtons />

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
          labelText="Snap Radius"
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
    <AccordionItem title="Polygon Attributes" open>
      <Form>
        {#if $selectedPolygonId && selectedPolygonAttributes}
          {#each selectedPolygonAttributes as attribute, i}
            <div style="display:flex">
              <TextInput required light disabled size="sm" value={attribute.name} />
              <TextInput
                required
                light
                size="sm"
                bind:value={$polygons[$selectedPolygonId].attributes[attribute.name]}
              />
              <Button
                kind="danger-tertiary"
                tooltipPosition="bottom"
                tooltipAlignment="center"
                iconDescription="Click & Drag Toolbar"
                size="small"
                on:click={() => polygons.deleteLocalAttribute($selectedPolygonId, attribute)}
                icon={TrashCan16}
              />
            </div>
          {/each}
        {/if}
      </Form>
      <Form on:submit={handleaddLocalAttributeSubmit}>
        <div style="display:flex">
          <TextInput
            required
            light
            size="sm"
            placeholder="Attribute Name"
            bind:value={newAttributeName}
          />
          <TextInput
            required
            light
            size="sm"
            placeholder="Attribute Value"
            bind:value={newAttributeValue}
          />
        </div>
        <div style="display:flex">
          <Button size="small" type="submit">Add</Button>
          <Toggle
            class="snap__toggle"
            labelA=""
            labelB="Add To All Polygons"
            bind:toggled={isNewAttributeGlobal}
          />
        </div>
      </Form>
    </AccordionItem>
  </Accordion>
</div>
