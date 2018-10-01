(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      define([], factory);
  } else if (typeof module === 'object' && module.exports) {
      module.exports = factory();
  } else {
      root.ColorQuantizer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  "use strict";

  /**
   * Create a grayscale copy of an ImageData
   */
  function grayscale(source){
    let gray = new Uint8ClampedArray(source.length);
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < source.length; i += 4) {
      r = source[i];
      g = source[i+1];
      b = source[i+2];
      gray[i] = gray[i+1] = gray[i+2] = 0.2126*r + 0.7152*g + 0.0722*b;
    }
    return gray;
  }

  /**
   * Compute the distance between 2 colors {red, green, blue}
   * Formula from from https://www.compuphase.com/cmetric.htm
   * @param {Object} color1 First {r, g, b} color
   * @param {Object} color2 Second {r, g, b} color
   * @return {float} Distance between both colors
   */
  function colorDistance(color1, color2) {
    let r = 0.5 * (color1.r + color2.r);
    let dr = color1.r - color2.r,
        dg = color1.g - color2.g,
        db = color1.b - color2.b;
    return Math.sqrt( (2*dr*dr) + (4*dg*dg) + (3*db*db) + (r * ((dr*dr)-(db*db))/256) );
  }

  /**
   * Get the index of the nearest color among a list of colors
   * @param {Object} color {r, g, b} color
   * @param {Object[]} color_list Array of colors
   * @return {int} Index of the nearest color in the list
   */
  function nearestColor(color, color_list) {
    let dist = 0xffff, tmp = 0, idx = 0;
    for (let i = 0; i < color_list.length; i++) {
      tmp = colorDistance(color, color_list[i]);
      if(tmp < dist) {
        dist = tmp;
        idx = i;
      }
    }
    return idx;
  }

  /**
   * Distance statistics between 2 lists of similar colors
   * @param {Object[]} list1 First Array of color
   * @param {Object[]} list2 Second Array of color
   * @return {object} Contains {min, max, mean} distance
   */
  function colorDistanceStats(list1, list2) {
    let max = 0, min = 256, mean = 0, dist = 0;
    for (let i = 0; i < list1.length; i++) {
      dist = colorDistance(list1[i], list2[i]);
      max = Math.max(max, dist);
      min = Math.min(min, dist);
      mean += dist;
    }
    mean /= list1.length;

    return {
      max: max,
      min: min,
      mean: mean
    };
  }

  /**
   * Compute a random color from an ImageData
   * @param {Uint8ClampedArray} data
   * @return {Object} {r, g, b} color
   */
  function randomColor(data) {
    let idx = Math.floor(Math.random()*(data.length>>2)) << 2;
    return {
      r: data[idx],
      g: data[idx+1],
      b: data[idx+2],
    };
  }

  /**
   * Compute the centroid of a cluster by averaging its colors
   * @param {Object[]} cluster Array of colors
   * @return {Object} {r, g, b} color
   */
  function computeClusterCentroid(cluster) {
    let red = 0, green = 0, blue = 0;
    for (let i = 0; i < cluster.length; i++) {
      red += cluster[i].r;
      green += cluster[i].g;
      blue += cluster[i].b;
    }
    red /= cluster.length;
    green /= cluster.length;
    blue /= cluster.length;

    if (isNaN(red) || isNaN(green) || isNaN(blue)) return null;

    return {
      r: red,
      g: green,
      b: blue
    };
  }

  /**
   * Compute color cluster by assigning a color from the centroids
   * to each color of an ImageData
   * @param {Uint8ClampedArray} data
   * @param {Object[]} centroids Array of colors
   * @return {Object} Contains the centroids and the assigned colors
   */
  function createClusters(data, centroids) {
    let i = 0;
    // initialize clusters containing color data
    let clusters = new Array(centroids.length);
    for (i = 0; i < clusters.length; i++) {
      clusters[i] = [];
    }
    // initialize array to keep track of assigned color in the data
    let assigned = new Array(data.length >> 2);
    for (i = 0; i < assigned.length; i++) {
      assigned[i] = -1;
    }

    let r = 0, g = 0, b = 0;
    let idx = 0, color = {};
    for (i = 0; i < data.length; i+=4) {
      color = {
        r: data[i],
        g: data[i+1],
        b: data[i+2]
      }
      // get the nearest color centroid, and assign that color in the cluter
      idx = nearestColor(color, centroids);
      clusters[idx].push(color);
      assigned[(i>>2)] = idx;
    }

    // compute the new color centroid of each cluster
    let new_centroids = new Array(centroids.length);
    for (i = 0; i < new_centroids.length; i++) {
      new_centroids[i] = computeClusterCentroid(clusters[i]);
      if (new_centroids[i] == null) {
        new_centroids[i] = randomColor(data);
      }
    }

    return {
      assigned: assigned,
      centroids: new_centroids
    };
  }

  /**
   * Uses k-means clustering method to get *k* clusters of colors based on
   * the colors of an image
   * @param {Uint8ClampedArray} data
   * @param {int} k Number of clusters
   */
  function computeKMeansClusters(data, k) {
    // initialize the centroid of each cluster
    let centroids = new Array(k);
    for (let i = 0; i < centroids.length; i++) {
      centroids[i] = randomColor(data);
    }

    let securityCount = 0;

    let different = true;
    let clusters = {}, prev_centroids = null, stats = null;
    // iterate until the centroid of each cluster stay unchanged
    while (different) {
      securityCount++;
      clusters = createClusters(data, centroids);
      centroids = clusters.centroids;
      // compare the color centroid between each iteration
      if (prev_centroids !== null) {
        stats = colorDistanceStats(prev_centroids, centroids);
        different = stats.max > 5 || stats.min > 0.5;
      }
      else {
        prev_centroids = new Array(centroids.length);
      }
      // update the centroids
      for (let i = 0; i < centroids.length; i++) {
        prev_centroids[i] = Object.assign({}, centroids[i]);
      }
      if (securityCount > 50) {
        console.log("Too much iteration: quantization stopped to avoid freezing");
        break;
      }
    }

    return clusters;
  }

  /**
   * Quantize an ImageData by computing color clusters before re-coloring
   * @param {Uint8ClampedArray} data
   * @param {int} k Number of clusters
   */
  function quantize(data, k) {
    let clusters = computeKMeansClusters(data, k);
    // apply the assigned color of each pixel
    let new_data = new Uint8ClampedArray(data.length), color = {};
    for (let i = 0; i < new_data.length; i+=4) {
      color = clusters.centroids[clusters.assigned[i>>2]];
      new_data[i] = color.r;
      new_data[i+1] = color.g;
      new_data[i+2] = color.b;
      new_data[i+3] = 255;
    }
    return new_data;
  }

  /**
   * Apply a new color to an ImageData
   * @param {Uint8ClampedArray} data
   * @param {Object[]} colors Array of colors to apply
   */
  function applyColor(data, colors) {
    let idx = 0;
    let new_data = new Uint8ClampedArray(data.length);
    for (let i = 0; i < data.length; i += 4) {
      // get the nearest color
      idx = nearestColor({
        r: data[i],
        g: data[i+1],
        b: data[i+2]
      }, colors);
      // assign new color
      new_data[i] = colors[idx].r;
      new_data[i+1] = colors[idx].g;
      new_data[i+2] = colors[idx].b;
      new_data[i+3] = 255;
    }
    return new_data
  }

  /**
   * Main methods, wrapper with Promises that accept user configuration
   */
  function compute(source, user_params) {
    let params = user_params || {};

    // If colors are provided, re-color the ImageData
    if (params.colors && Array.isArray(params.colors)) {
      for (let i = 0; i < params.colors.length; i++) {
        if (!params.colors[i].r || !params.colors[i].g || !params.colors[i].b) {
          return null;
        }
      }
      return new Promise(function(resolve, reject) {
        let new_data = applyColor(source.data, params.colors);
        resolve(new_data);
      });
    }
    // Else, quantize the ImageData
    else {
      let data = source.data, k = params.k || 3;
      if(!!params.grayscale) {
        data = grayscale(data);
      }
      return new Promise(function(resolve, reject) {
        let new_data = quantize(data, k);
        resolve(new_data);
      });
    }
  }

  // Object definition
  var ColorQuantizer = {
    compute: compute,
    quantize: quantize,
    applyColor: applyColor
  }

  // Worker message
  if (typeof self !== "undefined") {
    self.onmessage = function(e) {
      compute(e.data.img, e.data.config).then(function (res) {
        postMessage(res);
      });
    }
  }

  return ColorQuantizer;
}));
