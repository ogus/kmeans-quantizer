(function (root, factory) {
  if (typeof define === 'function' && define.amd) { define([], factory); }
  else if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.KMeansQuantizer = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Color object used in this module, all values in range [0, 255]
  function Color(red, green, blue) {
    this.red = red;
    this.green = green
    this.blue = blue;
  }


  // Compute the distance between 2 colors, return distance in range [0,1]
  // Formula from from https://www.compuphase.com/cmetric.htm
  function distance(color1, color2) {
    let mr = 0.5 * (color1.red + color2.red),
        dr = color1.red - color2.red,
        dg = color1.green - color2.green,
        db = color1.blue - color2.blue;
    let distance = (2*dr*dr) + (4*dg*dg) + (3*db*db) + (mr * ((dr*dr)-(db*db))/256);
    return Math.sqrt(distance) / (3*255);
  }

  // Get the index of the nearest color among a list of colors
  function nearestColorIdx(inputColor, colorList) {
    let distMin = 0xfff, dist = 0, idx = 0;
    for (let i = 0; i < colorList.length; i++) {
      dist = distance(inputColor, colorList[i]);
      if(dist < distMin) {
        distMin = dist;
        idx = i;
      }
    }
    return idx;
  }

  function nearestColor(inputColor, colorList) {
    let idx = nearestColorIdx(inputColor, colorList);
    return  colorList[idx];
  }

   function getColor(imgData, i) {
     return new Color(imgData[i], imgData[i+1], imgData[i+2]);
   }

   function setColor(imgData, i, color) {
     imgData[i] = color.red;
     imgData[i+1] = color.green;
     imgData[i+2] = color.blue;
     imgData[i+3] = 255;
   }

  // Compute a random color from an ImageData
  function pickRandomColor(imgData) {
    let idx = Math.floor(Math.random()*(imgData.length>>2)) << 2;
    return getColor(imgData, idx);
  }

  // Compute the mean of a list of colors
  function colorsMean(colorList) {
    let red = 0, green = 0, blue = 0;
    let length = colorList.length;
    for (let i = 0; i < length; i++) {
      red += colorList[i].red;
      green += colorList[i].green;
      blue += colorList[i].blue;
    }
    red /= length;
    green /= length;
    blue /= length;
    return new Color(red, green, blue);
  }

  // Compute the variance of a list of colors
  function colorsVariance(colorList) {
    let length = colorList.length;
    let mean = colorsMean(colorList);
    let dist = 0, distSum = 0;
    for (let i = 0; i < length; i++) {
      dist = distance(colorList[i], mean);
      distSum += (dist * dist);
    }
    return distSum / length;
  }


  function newClusterList(k) {
    let clusterList = new Array(k);
    for (let i = 0; i < clusterList.length; i++) {
      clusterList[i] = [];
    }
    return clusterList;
  }

  // Compute the centroid of each cluster by averaging their contained colors
  function getClusterCentroid(imgData, clusterList) {
    let centroidList = new Array(clusterList.length);
    for (let i = 0; i < centroidList.length; i++) {
      if (clusterList[i].length > 0) {
        centroidList[i] = colorsMean(clusterList[i]);
      }
      else {
        centroidList[i] = pickRandomColor(imgData);
      }
    }
    return centroidList;
  }


  function computeKMeans(imgData, k) {
    // initialization
    let clusterList = newClusterList(k);
    let centroidList = new Array(k);
    let assignement = new Array(imgData.length >> 2).fill(-1);
    let color = new Color(0,0,0);
    // end conditions
    let iter = 0, maxIter = 20;
    let previousVariance = new Array(k).fill(1);
    let variance = 0, delta = 0, deltaMax = 0, threshold = 0.0001;
    while (true) {
      // compute clusters
      centroidList = getClusterCentroid(imgData, clusterList);
      clusterList = newClusterList(k);
      for (let i = 0; i < imgData.length; i+=4) {
        color = getColor(imgData, i);
        assignement[i>>2] = nearestColorIdx(color, centroidList);
        clusterList[assignement[i>>2]].push(color);
      }
      // test convergence
      deltaMax = 0;
      for (let i = 0; i < clusterList.length; i++) {
        variance = colorsVariance(clusterList[i]);
        delta = Math.abs(previousVariance[i] - variance);
        deltaMax = Math.max(delta, deltaMax);
        previousVariance[i] = variance;
      }
      if (deltaMax < threshold || iter++ > maxIter) {
        break;
      }
    }
    return {centroidList: centroidList, clusterList: clusterList, assignement: assignement};
  }

  // Re-color an image by applying the nearest computed centroid color to each pixel
  function applyKMeans(imgData, kmeans) {
    let newImgData = new Uint8ClampedArray(imgData.length), color = 0;
    let centroidList = kmeans.centroidList;
    let assignement = kmeans.assignement;
    for (let i = 0; i < newImgData.length; i += 4) {
      setColor(newImgData, i, centroidList[assignement[i>>2]]);
    }
    return newImgData;
  }

  // Quantize an ImageData by computing the color palette, then re-coloring the image
  function quantize(imgData, params) {
    let k = parseInt(params.k);
    let kmeans = computeKMeans(imgData.data, k);
    let newImgData = applyKMeans(imgData.data, kmeans);
    return {
      imageData: newImgData,
      palette: kmeans.centroidList
    };
  }

  // Public interface
  function compute(imgData, params) {
    if (!!params.async) {
      return new Promise(function(resolve, reject) {
        let result = quantize(imgData, params);
        resolve(result);
      });
    }
    else {
      return quantize(imgData, params);
    }
  }

  // Worker message
  if (typeof self !== "undefined") {
    self.onmessage = function(e) {
      let imgData = e.data.imageData, params = e.data.params;
      if (!imgData || !params) {
        postMessage(null);
      }
      else {
        let result = quantize(imgData, params);
        postMessage(result);
      }
    }
  }

  // Object definition
  var KMeansQuantizer = {
    compute: compute
  };
  return KMeansQuantizer;

}));
