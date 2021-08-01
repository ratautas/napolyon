<script>
  import { Button, Toggle } from 'carbon-components-svelte';
  import {
    AreaCustom24,
    CloudDownload24,
    CloudUpload24,
    CopyFile24,
    Help24,
    Redo24,
    Switcher24,
    Undo24
  } from 'carbon-icons-svelte';
  import { saveAs } from 'file-saver';
  import { tick } from 'svelte';

  import { ACCEPT_TYPES } from '$lib/constants';
  import { showInfoModal } from '$lib/stores/infoModal';

  import {
    isDrawing,
    isCmdPressed,
    svgEl,
    selectedPolygonIndex,
    hoveredPolygonIndex,
    isToolbarDragging,
    imageSrc,
    history
  } from '$lib/stores';

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
  <Button
    kind="ghost"
    tooltipPosition="bottom"
    tooltipAlignment="center"
    iconDescription="Show Info Modal"
    icon={Help24}
    on:click={() => showInfoModal.set(true)}
  />
  <Toggle labelA="" size="sm" labelB="SNAP" disabled toggled={$isCmdPressed} />
</div>
