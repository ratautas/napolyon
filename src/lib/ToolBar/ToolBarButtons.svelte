<script>
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';

  import AreaCustom24 from 'carbon-icons-svelte/lib/AreaCustom24';
  import CloudDownload24 from 'carbon-icons-svelte/lib/CloudDownload24';
  import Switcher24 from 'carbon-icons-svelte/lib/Switcher24';
  import CopyFile24 from 'carbon-icons-svelte/lib/CopyFile24';
  import { saveAs } from 'file-saver';

  import { tick } from 'svelte';

  import {
    mode,
    renderSvg,
    selectedPolygonId,
    hoveredPolygonId,
    isToolbarDragging
  } from '$lib/stores.js';

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

  const handleCopyClick = async () => {
    selectedPolygonId.set(null);
    hoveredPolygonId.set(null);
    await tick();
    await navigator.clipboard.writeText($renderSvg.outerHTML);
  };

  const handleDowloadClick = async () => {
    selectedPolygonId.set(null);
    hoveredPolygonId.set(null);
    await tick();
    const blob = new Blob([$renderSvg.outerHTML], { type: 'image/svg+xml' });
    saveAs(blob, 'graph.svg');
  };
</script>

<!-- TODO: replace it with drag pattern -->
<div class="buttons">
  <div class="handle" on:mousedown={() => isToolbarDragging.set(true)}>
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
    iconDescription="Copy SVG Code"
    icon={CopyFile24}
    on:click={handleCopyClick}
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
