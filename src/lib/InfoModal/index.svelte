<script>
  import { Checkbox, Modal } from 'carbon-components-svelte';
  import { isInfoModalEnabled, showInfoModal } from '$lib/stores/infoModal';
  import { PREVENT_INFO_MODAL_KEY } from '$lib/constants';

  const handleCheckboxChange = (e) => {
    if (e.target.checked) {
      window?.localStorage?.removeItem(PREVENT_INFO_MODAL_KEY);
    } else {
      window?.localStorage?.setItem(PREVENT_INFO_MODAL_KEY, 1);
    }
  };
</script>

<Modal
  open={$showInfoModal}
  passiveModal={true}
  modalHeading=""
  on:close={() => showInfoModal.set(false)}
  size="sm"
>
  <ul>
    <li>Press <strong>d</strong> to start drawing a new shape.</li>
    <li>Press <strong>enter ⏎</strong> while drawing to finish drawing a shape.</li>
    <li>&nbsp;</li>
    <li>
      Hold <strong>cmd ⌘</strong> while adding or dragging a point to snap to the closest point or the
      edge fo the image.
    </li>
    <li>Hold <strong>shift ⇧</strong> while dragging a point to fix on a closest axis.</li>
    <li>Hold <strong>alt ⌥</strong> while clicking on a line to add a new point.</li>
    <li>Hold <strong>space</strong> to grab and drag canvas.</li>
    <li>&nbsp;</li>
    <li>Press <strong>delete ⌫</strong> when a single point is selected to delete it.</li>
    <li>Press <strong>delete ⌫</strong> when a shape is selected to delete it.</li>
    <li>&nbsp;</li>
    <li>Use <strong>delete ⌘ + z</strong> to undo and <strong>⌘ + ⇧ + z</strong> to redo.</li>
    <li>&nbsp;</li>
    <li>You can always revisit these instructions from toolbar. Have fun!</li>
    <li>&nbsp;</li>
  </ul>
  <Checkbox
    labelText="Show this window on startup"
    checked={$isInfoModalEnabled}
    on:change={handleCheckboxChange}
  />
</Modal>

<style>
  strong {
    display: inline-block;
    margin: 0 0.2em;
    padding: 0 0.6em;
    color: var(--black-800);
    text-shadow: 0 1px 0 var(--white);
    background-color: var(--black-075);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    box-shadow: 0 1px 1px rgb(12 13 14 / 15%), inset 0 1px 0 0 #fff;
    overflow-wrap: break-word;
  }
</style>
