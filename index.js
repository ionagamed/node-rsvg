'use strict'

const binding = require('bindings')('rsvg')
const util = require('util')

class Rsvg {
  /**
   * Represents one SVG file to be rendered.
   *
   * The only way to construct from now on is by passing the buffer into the constructor.
   *
   * @see [LibRSVG Default Constructor]{@link
    * https://developer.gnome.org/rsvg/2.40/RsvgHandle.html#rsvg-handle-new}
   * @see [LibRSVG Constructor From Data]{@link
    * https://developer.gnome.org/rsvg/2.40/RsvgHandle.html#rsvg-handle-new-from-data}
   *
   * @constructor
   * @param {(Buffer|string|Object)} buffer - SVG file.
   */
  constructor (buffer) {
    if (typeof buffer === 'string') {
      buffer = Buffer.from(buffer)
    }

    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('buffer should be a Buffer instance or a string')
    }

    try {
      this._handle = new binding.Rsvg(buffer)
      this._handle.close()
    } catch (error) {
      throw new Error(`Rsvg load failure: ${error.message}`)
    }
  }

  /**
   * Base URI of the svg.
   * @type {string}
   */
  get baseURI () {
    return this._handle.getBaseURI()
  }
  set baseURI (value) {
    this._handle.setBaseURI(value)
  }

  /**
   * Horizontal resolution.  Allowed values: >= 0.
   * @deprecated since version 2.0
   * @type {number}
   */
  get dpiX () {
    return this._handle.getDPIX()
  }
  set dpiX (value) {
    return this._handle.setDPIX(value)
  }

  /**
   * Vertical resolution.  Allowed values: >= 0.
   * @deprecated since version 2.0
   * @type {number}
   */
  get dpiY () {
    return this._handle.getDPIY()
  }
  set dpiY (value) {
    return this._handle.setDPIY(value)
  }

  /**
   * Image width.  Always integer.
   * @readonly
   * @type {number}
   */
  get width () {
    return this._handle.getWidth()
  }

  /**
   * Image height. Always integer.
   * @readonly
   * @member {number}
   */
  get height () {
    return this._handle.getHeight()
  }

  /**
   * Get the DPI for the outgoing pixbuf.
   *
   * @deprecated since version 2.0
   * @returns {{x: number, y: number}}
   */
  getDPI () {
    return this._handle.getDPI()
  }

  /**
   * Set the DPI for the outgoing pixbuf. Common values are 75, 90, and 300 DPI.
   * Passing null to x or y will reset the DPI to whatever the default value
   * happens to be (usually 90). You can set both x and y by specifying only the
   * first argument.
   *
   * @deprecated since version 2.0
   * @param {number} x - Horizontal resolution.
   * @param {number} [y] - Vertical resolution. Set to the same as X if left out.
   */
  setDPI (x, y) {
    this._handle.setDPI(x, y)
  }

  /**
   * Get the SVG's size or the size/position of a subelement if id is given. The
   * id must begin with "#".
   *
   * @param {string} [id] - Subelement to determine the size and position of.
   * @returns {{width: number, height: number, x: number, y: number}}
   */
  dimensions (id) {
    return this._handle.dimensions(id)
  }

  /**
   * Checks whether the subelement with given id exists in the SVG document.
   *
   * @param {string} id - Subelement to check existence of.
   * @returns {boolean}
   */
  hasElement (id) {
    return this._handle.hasElement(id)
  }

  /**
   * Find the drawing area, ie. the smallest area that has image content in the
   * SVG document.
   *
   * @returns {{width: number, height: number, x: number, y: number}}
   */
  autocrop () {
    const area = this._handle.autocrop()
    area.x = area.x.toFixed(3) * 1
    area.y = area.y.toFixed(3) * 1
    area.width = area.width.toFixed(3) * 1
    area.height = area.height.toFixed(3) * 1
    return area
  }

  /**
   * Base render method. Valid high-level formats are: png, pdf, svg, raw. You
   * can also specify the pixel structure of raw images: argb32 (default), rgb24,
   * a8, a1, rgb16_565, and rgb30 (only enabled for Cairo >= 1.12). You can read
   * more about the low-level pixel formats in the [Cairo Documentation]{@link
    * http://cairographics.org/manual/cairo-Image-Surfaces.html#cairo-format-t}.
   *
   * If the element property is given, only that subelement is rendered.
   *
   * The PNG format is the slowest of them all, since it takes time to encode the
   * image as a PNG buffer.
   *
   * @param {Object} [options] - Rendering options.
   * @param {string} [options.format] - One of the formats listed above.
   * @param {number} [options.width] - Output image width, should be an integer.
   * @param {number} [options.height] - Output image height, should be an integer.
   * @param {string} [options.id] - Subelement to render.
   * @returns {{data: Buffer, format: string, width: number, height: number}}
   */
  render (options) {
    if (arguments.length > 1 || typeof (options) !== 'object') {
      return this._renderArgs.apply(this, arguments)
    }

    options = options || {}

    var img = this._handle.render(
      options.width,
      options.height,
      options.format,
      options.id
    )

    if (this.width + this.height > 0 && img.data.length === 0) {
      // sometimes render fails and returns zero-sized buffer, see zerobuffer test
      // just rerender image
      return this.render(options)
    }
    return img
  }

  /**
   * Render the SVG as a raw memory buffer image. This can be used to create an
   * image that is imported into other image libraries. This render method is
   * usually very fast.
   *
   * The pixel format is ARGB and each pixel is 4 bytes, ie. the buffer size is
   * width*height*4. There are no memory "spaces" between rows in the image, like
   * there can be when calling the base render method with pixel formats like A8.
   *
   * @deprecated since version 2.0
   * @param {number} width - Output image width, should be an integer.
   * @param {number} height - Output image height, should be an integer.
   * @param {string} [id] - Subelement to render.
   * @returns {{data: Buffer, format: string, pixelFormat: string, width: number, height: number}}
   */
  renderRaw (width, height, id) {
    return this.render({
      format: 'raw',
      width: width,
      height: height,
      element: id
    })
  }

  /**
   * Render the SVG as a PNG image.
   *
   * @deprecated since version 2.0
   * @param {number} width - Output image width, should be an integer.
   * @param {number} height - Output image height, should be an integer.
   * @param {string} [id] - Subelement to render.
   * @returns {{data: Buffer, format: string, width: number, height: number}}
   */
  renderPNG (width, height, id) {
    return this.render({
      format: 'png',
      width: width,
      height: height,
      element: id
    })
  }

  /**
   * Render the SVG as a PDF document.
   *
   * @deprecated since version 2.0
   * @param {number} width - Output document width, should be an integer.
   * @param {number} height - Output document height, should be an integer.
   * @param {string} [id] - Subelement to render.
   * @returns {{data: Buffer, format: string, width: number, height: number}}
   */
  renderPDF (width, height, id) {
    return this.render({
      format: 'pdf',
      width: width,
      height: height,
      element: id
    })
  }

  /**
   * Render the SVG as an SVG. This seems superfluous, but it can be used to
   * normalize the input SVG. However you can not be sure that the resulting SVG
   * file is smaller than the input. It's not a SVG compression engine. You can
   * be sure that the output SVG follows a more stringent structure.
   *
   * @deprecated since version 2.0
   * @param {number} width - Output document width, should be an integer.
   * @param {number} height - Output document height, should be an integer.
   * @param {string} [id] - Subelement to render.
   * @returns {{data: string, format: string, width: number, height: number}}
   */
  renderSVG (width, height, id) {
    return this.render({
      format: 'svg',
      width: width,
      height: height,
      element: id
    })
  }

  /**
   * String representation of this SVG render object.
   * @returns {string}
   */
  toString () {
    const data = {
      width: this.width,
      height: this.height
    }

    if (this.baseURI) {
      data.baseURI = this.baseURI
    }

    return `{ [${this.constructor.name}]${util.inspect(data).slice(1)}`
  }

  /**
   * @deprecated since version 2.0
   * @private
   */
  _renderArgs (width, height, format, id) {
    return this._handle.render(width, height, format ? format.toLowerCase() : null, id)
  }
}

// Export the Rsvg object.
exports.Rsvg = Rsvg
