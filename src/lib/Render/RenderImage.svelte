<script>
  import { imageEl, imageSrc, imageWidth, imageHeight } from '$lib/stores.js';

  const handleImageLoad = async (e) => {
    imageWidth.set($imageEl.naturalWidth);
    imageHeight.set($imageEl.naturalHeight);
  };
</script>

<img
  src={$imageSrc}
  alt=""
  width={$imageWidth}
  height={$imageHeight}
  style={`width:${$imageWidth}px;height:${$imageHeight}px;`}
  bind:this={$imageEl}
  on:load={handleImageLoad}
/>
