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
phina.namespace(function() {

  // var projectionMatrix = mat4.create();
  // var viewMatrix = mat4.create();
  // var modelMatrix = mat4.create();
  // var mvpMatrix = mat4.create();
  // mat4.ortho(projectionMatrix, -0.5, 0.5, -0.5, 0.5, 0.9, 1.1);
  // mat4.lookAt(viewMatrix, [0, 0, 1], [0, 0, 0], [0, 1, 0]);
  // mat4.mul(mvpMatrix, projectionMatrix, viewMatrix);
  // mat4.mul(mvpMatrix, mvpMatrix, modelMatrix);
  var mvpMatrix = new Float32Array([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, -10, 0, 0, 0, 0, 1]);

  phina.define("phina.glfilter.GLFilterNode", {

    gl: null,
    enabled: true,
    uniformValues: null,

    init: function() {
      this.uniformValues = {};
      this.$watch("gl", function(value, oldValue) {
        if (!oldValue && value) {
          this.setup(value);
        }
      });
    },

    setup: function(gl) {
      this.screen = phigl.Drawable(gl)
        .setProgram(this._createProgram(gl))
        .setGeometry(phigl.PlaneXY({
          width: 1,
          height: 1,
          normalsEnabled: false,
        }))
        .declareUniforms([].concat(this.getVertexShaderUniforms(), this.getFragmentShaderUniforms()));
      this.screen.uniforms["mvpMatrix"].setValue(mvpMatrix);
    },

    render: function(src, dst) {
      var gl = this.gl;

      dst.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.screen.uniforms["texture"].setValue(0).setTexture(src);
      this.uniformValues
        .forIn(function(key, value) {
          if (key === "texture") return;
          this.screen.uniforms[key].setValue(value);
        }.bind(this));
      this.screen.draw();

      gl.flush();
    },

    _createProgram: function(gl) {
      var srcV = this.getVertexShaderSource();
      var srcF = this.getFragmentShaderSource();

      return phigl.Program(gl)
        .attach(phigl.VertexShader().setSource(srcV))
        .attach(phigl.FragmentShader().setSource(srcF))
        .link();
    },

    getVertexShaderSource: function() {
      return [
        "attribute vec3 position;",
        "attribute vec2 uv;",

        "uniform mat4 mvpMatrix;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vUv = uv;",
        "  gl_Position = mvpMatrix * vec4(position, 1.0);",
        "}",
      ].join("\n");
    },
    getVertexShaderUniforms: function() {
      return ["mvpMatrix"];
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 col = texture2D(texture, vUv);",
        "  if (col.a == 0.0) discard;",
        "  gl_FragColor = col;",
        "}",
      ].join("\n");
    },
    getFragmentShaderUniforms: function() {
      return ["texture"];
    },

  });

  phina.define("phina.glfilter.StartNode", {
    superClass: "phina.glfilter.GLFilterNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 col = texture2D(texture, vec2(vUv.x, 1.0 - vUv.y));",
        "  if (col.a == 0.0) discard;",
        "  gl_FragColor = col;",
        "}",
      ].join("\n");
    },
  });

  phina.define("phina.glfilter.EndNode", {
    superClass: "phina.glfilter.GLFilterNode",

    init: function() {
      this.superInit();
    },

    render: function(src/*, dst*/) {
      var gl = this.gl;

      phigl.Framebuffer.unbind(gl);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.screen.uniforms["texture"].setValue(0).setTexture(src);
      this.screen.draw();

      gl.flush();
    },
  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.MonotoneNode", {
    superClass: "phina.glfilter.GLFilterNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 col = texture2D(texture, vUv);",
        "  if (col.a == 0.0) discard;",
        "  float c = col.r + col.g + col.b;",
        "  gl_FragColor = vec4(vec3(c / 3.0), col.a);",
        "}",
      ].join("\n");
    },
  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.ReverseNode", {
    superClass: "phina.glfilter.GLFilterNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 col = texture2D(texture, vUv);",
        "  if (col.a == 0.0) discard;",
        "  gl_FragColor = vec4(1.0 - col.rgb, col.a);",
        "}",
      ].join("\n");
    },
  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.SepiaNode", {
    superClass: "phina.glfilter.GLFilterNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 tex = texture2D(texture, vUv);",
        "  vec3 c = vec3((tex.r + tex.g + tex.b) / 3.0);",
        "  gl_FragColor = vec4(c.r * 1.2, c.g * 1.05, c.b * 0.9, tex.a);",
        "}",
      ].join("\n");
    },
  });

});

phina.namespace(function() {

  phina.define("phina.glfilter.ZoomBlurNode", {
    superClass: "phina.glfilter.GLFilterNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",
        "uniform float x;",
        "uniform float y;",

        "varying vec2 vUv;",

        "const float nFrag = 1.0 / 30.0;",
        "const float strength = 8.0;",

        "float rnd(vec3 scale, float seed){",
        "    return fract(sin(dot(gl_FragCoord.stp + seed, scale)) * 43758.5453 + seed);",
        "}",

        "void main(void){",
        "    vec2  center = vec2(x, 1.0 - y);",
        "    vec4  destColor = vec4(0.0);",
        "    float random = rnd(vec3(12.9898, 78.233, 151.7182), 0.0);",
        "    vec2  fcc = vUv - center;",
        "    float totalWeight = 0.0;",
        "",
        "    for(float i = 0.0; i <= 30.0; i++){",
        "        float percent = (i + random) * nFrag;",
        "        float weight = percent - percent * percent;",
        "        vec2  t = vUv - fcc * percent * strength * nFrag;",
        "        vec4 col = texture2D(texture, t);",
        "        destColor += col * weight;",
        "        totalWeight += weight;",
        "    }",
        "    gl_FragColor = vec4(destColor / totalWeight);",
        "}",
      ].join("\n");
    },
    getFragmentShaderUniforms: function() {
      return ["texture", "x", "y"];
    },

  });

});

//# sourceMappingURL=phina.glfilter.js.map
