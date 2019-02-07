(function (window, document) {
  'use strict';

  var DOM = {
    buttonStart: null,
    buttonReset: null,
    input: null,
    canvas: null
  };

  var ctx = null,
      srcImgData = null,
      isBusy = false,
      userConfig = {},
      quantizerWorker = null;

  window.onload = function () {
    DOM.buttonStart = document.getElementById('button');
    DOM.buttonReset = document.getElementById('reset_button');
    DOM.input = document.getElementById('file_input');
    DOM.canvas = document.getElementById('canvas');

    ctx = DOM.canvas.getContext('2d');
    setBusy(false);
    initWebWorker();
    initListener();
    extractDataFromSrc('assets/placeholder.jpg');
  }

  function initListener() {
		let prevDefault = function (e) { e.preventDefault(); }

    document.addEventListener('drop', function (e) {
      e.preventDefault();
      readFile(e.dataTransfer.files[0]);
    });
		document.addEventListener('dragenter', prevDefault);
		document.addEventListener('dragover', prevDefault);
		document.addEventListener('dragleave', prevDefault);

    DOM.input.addEventListener('change', function () {
      readFile(DOM.input.files[0]);
    });

    DOM.buttonStart.addEventListener('click', startQuantization);
    DOM.buttonReset.addEventListener('click', resetImgData);
  }

  function initWebWorker() {
    if (window.Worker) {
      quantizerWorker = new Worker('../src/kmeans-quantizer.js');
      quantizerWorker.onmessage = function (e) {
        handleQuantization(e.data);
      }
    }
  }

  function readFile(file) {
    if (!isBusy && file && file.type.includes('image')) {
      setBusy(true);
      let reader = new FileReader();
  		reader.addEventListener('load', function () {
        extractDataFromSrc(reader.result);
        setBusy(false);
      });
      reader.readAsDataURL(file);
    }
  }

  function extractDataFromSrc(src) {
    let img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = function () {
      document.getElementById('preview').src = img.src;
      DOM.canvas.width = img.width;
      DOM.canvas.height = img.height;
      ctx.drawImage(img, 0, 0, DOM.canvas.width, DOM.canvas.height);
      srcImgData = ctx.getImageData(0,0, DOM.canvas.width, DOM.canvas.height);
    }
    img.src = src;
  }

  function startQuantization() {
    if (isBusy) {
      return;
    }
    setBusy(true);
    let params = getUserParams();
    if (params != null) {
      if (quantizerWorker != null) {
        quantizerWorker.postMessage({imageData: srcImgData, params: params});
      }
      else {
        KMeansQuantizer.compute(srcImgData, params).then(handleQuantization);
      }
    }
    else {
      setBusy(false);
    }
  }

  function handleQuantization(result) {
    console.log(result.palette);
    let imgData = new ImageData(result.imageData, canvas.width, canvas.height);
    ctx.putImageData(imgData, 0,0);
    setBusy(false);
  }

  function getUserParams() {
    let kInput = document.getElementById('k_config');
    if(kInput.checkValidity()) {
      return {
        k: parseInt(kInput.value),
        async: true
      };
    }
    else{
      return null;
    }
  }

  function resetImgData(imgData) {
    if (!!srcImgData) {
      ctx.putImageData(srcImgData, 0,0);
    }
  }

  function setBusy(b) {
    if (b) {
      isBusy = true;
      DOM.buttonStart.textContent = 'Computing...'
    }
    else {
      isBusy = false;
      DOM.buttonStart.textContent = 'Quantize';
    }
  }

})(window, window.document);
