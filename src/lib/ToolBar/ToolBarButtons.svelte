<script>
  import Button from 'carbon-components-svelte/src/Button/Button.svelte';
  import Toggle from 'carbon-components-svelte/src/Toggle/Toggle.svelte';

  import AreaCustom24 from 'carbon-icons-svelte/lib/AreaCustom24';
  import CloudDownload24 from 'carbon-icons-svelte/lib/CloudDownload24';
  import CloudUpload24 from 'carbon-icons-svelte/lib/CloudUpload24';
  import Switcher24 from 'carbon-icons-svelte/lib/Switcher24';
  import CopyFile24 from 'carbon-icons-svelte/lib/CopyFile24';
  import Undo24 from 'carbon-icons-svelte/lib/Undo24';
  import Redo24 from 'carbon-icons-svelte/lib/Redo24';
  import { saveAs } from 'file-saver';

  import { tick } from 'svelte';

  import { ACCEPT_TYPES } from '$lib/constants';

  import {
    isDrawing,
    isCmdPressed,
    svgEl,
    selectedPolygonIndex,
    hoveredPolygonIndex,
    isToolbarDragging,
    imageSrc,
    history
  } from '$lib/stores.js';

  const clearAttributes = () => {
    $svgEl.querySelectorAll('polygon').forEach((polygonEl) => {
      // polygonEl.removeAttribute('class');
      polygonEl.removeAttribute('id');
    });
  };

  const handleAddClick = (e, targetMode) => {
    e.stopPropagation();
    isDrawing.set(!$isDrawing);
  };

  const handleCopyClick = async () => {
    selectedPolygonIndex.set(-1);
    hoveredPolygonIndex.set(-1);
    await tick();
    clearAttributes();
    await navigator.clipboard.writeText($svgEl.outerHTML);
  };

  const handleDowloadClick = async () => {
    selectedPolygonIndex.set(-1);
    hoveredPolygonIndex.set(-1);
    await tick();
    clearAttributes();
    const blob = new Blob([$svgEl.outerHTML], { type: 'image/svg+xml' });
    saveAs(blob, 'graph.svg');
  };

  const handleFileInputChange = (e) => {
    console.log({ e });
    const reader = new FileReader();
    const [file] = e.target.files;
    reader.readAsDataURL(file);
    reader.onload = () => {
      imageSrc.set(reader.result);
    };
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
    isSelected={$isDrawing}
    on:click={(e) => handleAddClick(e, 'draw')}
  />
  <Button
    kind="ghost"
    tooltipPosition="bottom"
    tooltipAlignment="center"
    iconDescription="Upload Image"
    icon={CloudUpload24}
  >
    <input
      on:change={handleFileInputChange}
      type="file"
      class="btn-upload"
      accept={ACCEPT_TYPES.join()}
    />
  </Button>
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
  <Button
    kind="ghost"
    tooltipPosition="bottom"
    tooltipAlignment="center"
    iconDescription="Download SVG File"
    icon={Undo24}
    disabled={$history.undoQueue.length === 0}
    on:click={history.undo}
  />
  <Button
    kind="ghost"
    tooltipPosition="bottom"
    tooltipAlignment="center"
    iconDescription="Download SVG File"
    icon={Redo24}
    disabled={$history.redoQueue.length === 0}
    on:click={history.redo}
  />
  <Toggle labelA="" size="sm" labelB="SNAP" disabled toggled={$isCmdPressed} />
</div>