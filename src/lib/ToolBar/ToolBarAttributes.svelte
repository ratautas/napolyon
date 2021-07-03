<script>
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';
  import TextInput from 'carbon-components-svelte/src/TextInput/TextInput.svelte';
  import Toggle from 'carbon-components-svelte/src/Toggle/Toggle.svelte';
  import Form from 'carbon-components-svelte/src/Form/Form.svelte';

  import TrashCan16 from 'carbon-icons-svelte/lib/TrashCan16';

  import {
    mode,
    selectedPolygon,
    selectedPolygonId,
    polygons,
    globalAttributes
  } from '$lib/stores.js';

  let newAttributeName = '';
  let newAttributeValue = '';
  let isNewAttributeGlobal = true;

  const handleaddLocalAttributeSubmit = () => {
    const attributeToAdd = {
      name: newAttributeName,
      value: newAttributeValue
    };

    if (isNewAttributeGlobal) {
      polygons.addGlobalAttribute(attributeToAdd);
      globalAttributes.add(attributeToAdd);
    } else {
      polygons.addLocalAttribute($selectedPolygonId, attributeToAdd);
    }

    newAttributeName = '';
    newAttributeValue = '';
  };

  $: selectedPolygonAttributes =
    $selectedPolygon &&
    $selectedPolygon.attributes &&
    Object.entries($selectedPolygon.attributes).reduce(
      (acc, [name, value]) => [...acc, { name, value }],
      []
    );
</script>

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
