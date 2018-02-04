phina.namespace(function() {

  phina.define("phina.glfilter.GLFilterLayer", {
    superClass: "phina.display.Layer",

    _filterNodes: null,

    init: function(options) {
      this.superInit(options);

      this._filterNodes = [];

      var width = options.width;
      var height = options.height;

      // 2D
      this.canvas = phina.graphics.Canvas();
      this.canvas.width = width;
      this.canvas.height = height;
      this.aspectRate = width / height;
      this.renderer = phina.display.CanvasRenderer(this.canvas);
      this.domElement = this.canvas.domElement;

      // 3D
      this.sizeInfo = phigl.ImageUtil.calcSizePowOf2(width, height);
      this.domElementGL = document.createElement("canvas");

      var gl = this.gl = this.domElementGL.getContext("webgl");

      this.domElementGL.width = this.sizeInfo.width;
      this.domElementGL.height = this.sizeInfo.height;
      gl.viewport(0, 0, this.sizeInfo.width, this.sizeInfo.height);

      gl.clearColor(0.0, 0.0, 0.0, 0.0);

      this.resizedCanvas = phina.graphics.Canvas();
      this.resizedCanvas.setSize(this.sizeInfo.width, this.sizeInfo.height);
      this.screenTexture = phigl.Texture(gl);

      this.framebuffer0 = phigl.Framebuffer(gl, this.sizeInfo.width, this.sizeInfo.height);
      this.framebuffer1 = phigl.Framebuffer(gl, this.sizeInfo.width, this.sizeInfo.height);

      this.startNode = phina.glfilter.StartNode();
      this.startNode.gl = this.gl;
      this.endNode = phina.glfilter.EndNode();
      this.endNode.gl = this.gl;
    },

    addFilterNode: function(filterNode) {
      filterNode.gl = this.gl;
      this._filterNodes.push(filterNode);
      return this;
    },

    render: function() {
      var sizeInfo = this.sizeInfo;
      this.resizedCanvas.clear();
      this.resizedCanvas.context.drawImage(this.domElement,
        // src
        0, 0, this.width, this.height,
        // dst
        sizeInfo.srcX, sizeInfo.srcY, sizeInfo.srcWidth, sizeInfo.srcHeight
      );
      this.screenTexture.setImage(this.resizedCanvas);

      this.startNode.render(this.screenTexture, this.framebuffer1);

      var src = this.framebuffer1;
      var dst = this.framebuffer0;
      this._filterNodes
        .filter(function(filterNode) {
          return filterNode.enabled;
        })
        .forEach(function(filterNode) {
          filterNode.render(src.texture, dst);

          var temp = src;
          src = dst;
          dst = temp;
        });

      this.endNode.render(src.texture);
    },

    draw: function(canvas) {
      // 2D
      var temp = this._worldMatrix;
      this._worldMatrix = null;
      this.renderer.render(this);
      this._worldMatrix = temp;

      // 3D
      this.render();

      var domElementGL = this.domElementGL;
      var sizeInfo = this.sizeInfo;
      canvas.context.drawImage(domElementGL,
        // src
        sizeInfo.srcX, sizeInfo.srcY, sizeInfo.srcWidth, sizeInfo.srcHeight,
        // dst
        -this.width * this.originX, -this.height * this.originY, this.width, this.height
      );
    },

  });

});