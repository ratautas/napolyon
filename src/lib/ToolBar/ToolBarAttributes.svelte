<script>
  import { Button, Form, TextInput, Toggle } from 'carbon-components-svelte';
  import { Add16, TrashCan16 } from 'carbon-icons-svelte';

  import {
    isInputFocused,
    selectedPolygon,
    selectedPolygonIndex,
    polygons,
    globalAttributes
  } from '$lib/stores';

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
          <TextInput
            required
            labelText={attribute.name}
            bind:value={$polygons[$selectedPolygonIndex].attributes[attribute.name]}
            on:focus={() => isInputFocused.set(true)}
            on:blur={() => isInputFocused.set(false)}
          />
          <Button
            class="attributes__delete"
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
    <p><strong>New Attribute:</strong></p>
    <Form on:submit={handleAddAttributeSubmit}>
      <div class="attributes__row">
        <TextInput
          required
          light
          size="sm"
          placeholder="Attribute Name"
          bind:value={newAttributeName}
          on:focus={() => isInputFocused.set(true)}
          on:blur={() => isInputFocused.set(false)}
        />
        <TextInput
          required
          placeholder="Attribute Value"
          bind:value={newAttributeValue}
          on:focus={() => isInputFocused.set(true)}
          on:blur={() => isInputFocused.set(false)}
        />
      </div>
      <div class="attributes__add">
        <Button size="large" type="submit" icon={Add16}>ADD</Button>
        <Toggle
          class="attributes__snap"
          labelA=""
          labelB="Add To All Polygons"
          bind:toggled={isNewAttributeGlobal}
          on:focus={() => isInputFocused.set(true)}
          on:blur={() => isInputFocused.set(false)}
        />
      </div>
    </Form>
  </div>
{/if}
