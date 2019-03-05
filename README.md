# K-Means Quantizer

A color quantization tool for images based on k-means clustering


## Introduction

Color quantization is the process of reducing the number of distinct colors in an image. It is associated with palette generation, as the input color space is automatically reduced to a new output color space of a fixed size, computed by an algorithm (*k-means here*). This is why a color quantizer can be used either to reduce the number of colors, or to extract a palette of colors.

k-means clustering aims to partition *N* observations into *k* clusters, by assigning each observation to the cluster with the nearest centroid. It is one of the simplest clustering algorithm, and it is often used in unsupervised machine learning.

**Note 1:** The performance of the k-means quantizer are limited by the performance of the clustering algorithm. The k-means algorithm is slow, therefore the quantization might be slow for large images with many colors.

**Note 2:** There is no dithering implemented in this module.


## Usage

```js
// Step 0: import the module (based on your environment)
import KMeansQuantizer from 'kmeans-quantizer.js';

// Step 1: get an image
var myImage = new Image(100, 200);
myImage.src = 'picture.jpg';

// Step 2: get the pixel colors
var canvas = document.createElement('canvas');
var context = canvas.getContext('2d');
context.drawImage(myImage, 0, 0);
var imageData = context.getImageData(x, y, 1, 1).data;

// Step 3: quantize !
var colorCount = 8;
var async = false;
var quantization = KMeansQuantizer.compute(imageData, 5, async);

// Step 4: use it ?
console.log(quantization.imageData);
// >>> [45,43,138,255, 98,53,123,255, 65,28,98,255, ...]
console.log(quantization.palette);
// >>> [{red: 45, green: 43, blue: 138}, {...}, ...]
```


## API

### Quantization Method

#### KMeansQuantizer.compute(imageData, colorCount[, async])

Apply the quantization algorithm to the input array of pixel colors, and return an array with all pixel mapped to a color of the reduced color palette.

Arguments:

 + `imageData`: `Array`, the pixels RGBA value, usually a `Uint8ClampedArray` obtained from a canvas.

 + `colorCount`: `Number`, the number of colors for the quantization

 + `async`: `Boolean`, set to `true` to togggle asynchronous mode (default: `false`)

If async is `true`,  the method return a `Promise` that contains the result:
```js
KMeansQuantizer.compute(imageData, 5, true).then(result => {
  console.log(result.imageData);
  console.log(result.palette);
})
```

### Result Format

The quantization returns two values, packed in an `Object`.

#### result.imageData

This is an `Array` that contains the RGBA value of each pixel from the input. Each value is a `Number` in the range [0, 255].

The values are grouped by 4, ordered as follow: Red, Green, Blue, Alpha.

```js
result.imageData = [red,green,green,alpha, red,green,blue,alpha, ...]
```

The length of the list is equals to the length of the input `imageData`

#### result.palette

This is an `Array` that contains the value of each color of the palette. Each value is an `Object` with 3 properties: `red`, `green`, `blue`. Each property is a `Number` in the range [0, 255].

```js
result.palette = [{red: Number, green: Number, blue: Number}, ...]
```

The length of the list is equals to the input `colorCount`.

### Web Worker

The module can be used as a Web Worker. This allows the quantization of large image without blocking the UI when the module is used in a browser.

The worker accept the same input, organized in an `Object`:

```js
var worker = new Worker('kmeans-quantizer.js');
worker.onmessage = function (result) {
  console.log(result.imageData);
  console.log(result.palette);
}

// Quantization time !
worker.postMessage({
  imageData: myImageData,
  colorCount: 5
});
```


## Installation

The module can be installed from `npm`

```sh
npm install kmeans-quantizer
```

It can also be installed by cloning the repository & including the `kmeans-quantizer.js` file in your project.


## License

This project is licensed under the WTFPL - see [LICENSE](LICENSE) for more details
