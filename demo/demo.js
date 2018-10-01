(function (window, document) {
  "use strict";

  var $button, $reset_button, $input;
  var canvas, ctx, img_data, is_busy;

  var config = {
      k: 10,
      grayscale: false
      // ,colors: [
      //   {r: 15, g: 56, b: 15},
      //   {r: 48, g: 98, b: 48},
      //   {r: 139, g: 172, b: 15},
      //   {r: 155, g: 188, b: 15},
      // ]
    };

  var quantizerWorker = new Worker('../src/color-quantizer.min.js');

  const PLACEHOLDER = "assets/placeholder.jpg";

  window.onload = function () {
    $button = document.getElementById("button");
    $reset_button = document.getElementById("reset_button");
    $input = document.getElementById("file_input");

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    quantizerWorker.onmessage = function(e) {
      if (e.data !== null) {
        applyImageData(e.data);
      }
    }

    setBusy(false);
    img_data = undefined;

    initListener();
    extractDataFromSrc(PLACEHOLDER);
  }

  function initListener() {
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      readFile(e.dataTransfer.files[0]);
    }, false);
    $input.addEventListener('change', function () {
      readFile($input.files[0]);
    }, false);

		let prevDefault = e => e.preventDefault();
		document.addEventListener('dragenter', prevDefault, false);
		document.addEventListener('dragover', prevDefault, false);
		document.addEventListener('dragleave', prevDefault, false);

    $button.addEventListener("click", startWorkerQuantization, false);
    $reset_button.addEventListener("click", resetImage, false);
  }

  function readFile(file) {
    if (!is_busy && file && file.type.includes('image')) {
      setBusy(true);
      let reader = new FileReader();
  		reader.addEventListener('load', function () {
        extractDataFromSrc(reader.result);
      }, false);
      reader.readAsDataURL(file);
    }
  }

  function extractDataFromSrc(src) {
    setBusy(true);

    let img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      setBusy(false);
      document.getElementById("preview").src = img.src;

      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img_data = ctx.getImageData(0,0, canvas.width, canvas.height);
    }
    img.src = src;
  }

  function startWorkerQuantization() {
    if (!is_busy) {
      setBusy(true);
      let valid_config = getConfig();
      if (valid_config) {
        quantizerWorker.postMessage({img: img_data, config: config});
      }
    }
  }

  function applyImageData(img_data) {
    let data = new ImageData(img_data, canvas.width, canvas.height);
    ctx.putImageData(data, 0,0);
    setBusy(false);
  }

  function getConfig() {
    let $k = document.getElementById("k_config");
    if($k.checkValidity()) {
      config.k = parseInt($k.value);
    }
    else{ return false; }

    let $gray = document.getElementById("gray_config");
    if($gray.checkValidity()) {
      config.grayscale = $gray.checked;
    }
    else{ return false; }

    return true;
  }

  function resetImage() {
    if(img_data != undefined) {
      ctx.putImageData(img_data, 0, 0);
    }
  }

  function setBusy(b) {
    if (b) {
      is_busy = true;
      $button.textContent = "Computing..."
    }
    else {
      is_busy = false;
      $button.textContent = "Quantize";
    }
  }

})(window, window.document);
