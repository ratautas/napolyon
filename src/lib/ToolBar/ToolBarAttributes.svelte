<script>
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';
  import TextInput from 'carbon-components-svelte/src/TextInput/TextInput.svelte';
  import Toggle from 'carbon-components-svelte/src/Toggle/Toggle.svelte';
  import Form from 'carbon-components-svelte/src/Form/Form.svelte';

  import TrashCan16 from 'carbon-icons-svelte/lib/TrashCan16';
  import Add16 from 'carbon-icons-svelte/lib/Add16';

  import {
    selectedPolygon,
    selectedPolygonId,
    selectedPolygonIndex,
    polygons,
    globalAttributes
  } from '$lib/stores.js';

  let isNewOpen = false;
  let newAttributeName = '';
  let newAttributeValue = '';
  let isNewAttributeGlobal = true;

  const handleAddAttributeSubmit = () => {
    const attribute = {
      name: newAttributeName,
      value: newAttributeValue
    };

    if (isNewAttributeGlobal) {
      polygons.addGlobalAttribute(attribute);
      globalAttributes.add(attribute);
    } else {
      polygons.addLocalAttribute(attribute);
    }

    newAttributeName = '';
    newAttributeValue = '';
  };

  $: selectedPolygonAttributes =
    $selectedPolygon &&
    Object.entries($selectedPolygon?.attributes).reduce(
      (acc, [name, value]) => [...acc, { name, value }],
      []
    );
</script>

<div class="attributes">
  <Form>
    {#if selectedPolygonAttributes?.length}
      {#each selectedPolygonAttributes as attribute, i}
        <div class="attributes__row">
          <TextInput required light disabled size="sm" value={attribute.name} />
          <TextInput
            required
            light
            size="sm"
            bind:value={$polygons[$selectedPolygonIndex].attributes[attribute.name]}
          />
          <Button
            kind="ghost"
            tooltipPosition="bottom"
            tooltipAlignment="center"
            iconDescription="Remove Attribute"
            size="small"
            on:click={() => polygons.deleteLocalAttribute(attribute)}
            icon={TrashCan16}
          />
        </div>
      {/each}
    {/if}
    {#if !isNewOpen}
      <Button size="small" icon={Add16} on:click={() => (isNewOpen = true)}>Add Attribute</Button>
    {/if}
  </Form>
</div>
{#if isNewOpen}
  <div class="attributes">
    <Form on:submit={handleAddAttributeSubmit}>
      <div class="attributes__row">
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
        <Button size="small" type="submit" icon={Add16} />
      </div>
      <div class="attributes__row">
        <Toggle
          class="snap__toggle"
          labelA=""
          labelB="Add To All Polygons"
          bind:toggled={isNewAttributeGlobal}
        />
      </div>
    </Form>
  </div>
{/if}
