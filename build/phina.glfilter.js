phina.namespace(function() {

  phina.define("phina.glfilter.GLFilterLayer", {
    superClass: "phina.display.Layer",

    enableGL: true,

    gl: null,

    canvas: null,
    renderer: null,
    domElement: null,

    sizeInfo: null,
    domElementGL: null,

    resizedCanvas: null,
    texture: null,

    framebuffer0: null,
    framebuffer1: null,

    startNode: null,
    nodes: null,
    endNode: null,

    init: function(options) {
      this.superInit(options);

      var width = options.width;
      var height = options.height;

      // 2D
      this.canvas = phina.graphics.Canvas();
      this.canvas.width = width;
      this.canvas.height = height;
      this.renderer = phina.display.CanvasRenderer(this.canvas);
      this.domElement = this.canvas.domElement;

      // 3D
      this.sizeInfo = phigl.ImageUtil.calcSizePowOf2(width * options.quarity, height * options.quarity);
      this.domElementGL = document.createElement("canvas");

      var gl = this.gl = this.domElementGL.getContext("webgl");

      this.domElementGL.width = this.sizeInfo.width;
      this.domElementGL.height = this.sizeInfo.height;
      gl.viewport(0, 0, this.sizeInfo.width, this.sizeInfo.height);

      gl.clearColor(0.0, 0.0, 0.0, 0.0);

      this.resizedCanvas = phina.graphics.Canvas();
      this.resizedCanvas.setSize(this.sizeInfo.width, this.sizeInfo.height);
      this.texture = phigl.Texture(gl);

      this.framebuffer0 = phigl.Framebuffer(gl, this.sizeInfo.width, this.sizeInfo.height);
      this.framebuffer1 = phigl.Framebuffer(gl, this.sizeInfo.width, this.sizeInfo.height);

      this.startNode = phina.glfilter.StartNode();
      this.startNode.layer = this;
      this.nodes = [];
      this.endNode = phina.glfilter.EndNode();
      this.endNode.layer = this;
    },

    addNode: function(node) {
      node.layer = this;
      this.nodes.push(node);
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
      this.texture.setImage(this.resizedCanvas);

      this.startNode.render(this, this.framebuffer1, sizeInfo);

      var src = this.framebuffer1;
      var dst = this.framebuffer0;
      this.nodes
        .filter(function(filterNode) {
          return filterNode.enabled;
        })
        .forEach(function(filterNode) {
          filterNode.render(src, dst, sizeInfo);

          // swap
          var t = src;
          src = dst;
          dst = t;
        });

      this.endNode.render(src, sizeInfo);
    },

    draw: function(canvas) {
      // 2D
      var temp = this._worldMatrix;
      this._worldMatrix = null;
      this.renderer.render(this);
      this._worldMatrix = temp;

      if (this.enableGL) {
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
      } else {
        var domElement = this.domElement;
        canvas.context.drawImage(domElement,
          // src
          0, 0, domElement.width, domElement.height,
          // dst
          -this.width * this.originX, -this.height * this.originY, this.width, this.height
        );
      }
    },

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.BloomNode", {
    superClass: "phina.glfilter.Node",

    init: function() {
      this.superInit();
      this.luminanceNode = phina.glfilter.LuminanceFilter();
      this.gaussianNode = phina.glfilter.MultiGaussianNode(4, 4);
      this.mixNode = phina.glfilter.MixNode(1.0, 1.0);

      this.minBright = 0.0;
    },

    _setup: function() {
      this.superMethod("_setup");

      var gl = this.layer.gl;
      var sizeInfo = this.layer.sizeInfo;

      this.luminanceNode.layer = this.layer;
      this.gaussianNode.layer = this.layer;
      this.mixNode.layer = this.layer;

      this.bloomPath0 = phigl.Framebuffer(gl, sizeInfo.width, sizeInfo.height);
      this.bloomPath1 = phigl.Framebuffer(gl, sizeInfo.width, sizeInfo.height);
    },

    _render: function(src, dst, sizeInfo) {
      this.luminanceNode.render(src, this.bloomPath0, sizeInfo);
      this.gaussianNode.render(this.bloomPath0, this.bloomPath1, sizeInfo);
      this.mixNode.render(src, this.bloomPath1, dst, sizeInfo);
    },

    _accessor: {
      minBright: {
        get: function() {
          return this.luminanceNode.uniformValues["minBright"];
        },
        set: function(v) {
          this.luminanceNode.uniformValues["minBright"] = v;
        },
      },
    },

  });

  phina.define("phina.glfilter.LuminanceFilter", {
    superClass: "phina.glfilter.ShaderNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",
        "uniform float minBright;",

        "varying vec2 vUv;",

        "void main(void){",
        "  vec4 texel = texture2D(texture, vUv);",
        "  vec3 col = max(vec3(0.0), (texel - minBright).rgb);",
        "  gl_FragColor = vec4(col, texel.a);",
        "}",
      ].join("\n");
    },
    getFragmentShaderUniforms: function() {
      return ["texture", "minBright"];
    },

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.CopyNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function() {
      this.superInit();
    },

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.GaussianNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function() {
      this.superInit();
      this.on("prerender", function(e) {
        var sizeInfo = e.sizeInfo;
        this.resolution = [sizeInfo.width, sizeInfo.height];
      });
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",
        "uniform vec2 resolution;",
        "uniform vec2 direction;",

        "varying vec2 vUv;",

        // "vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {",
        // "  vec4 color = vec4(0.0);",
        // "  vec2 off1 = vec2(1.411764705882353) * direction;",
        // "  vec2 off2 = vec2(3.2941176470588234) * direction;",
        // "  vec2 off3 = vec2(5.176470588235294) * direction;",
        // "  color += texture2D(image, uv) * 0.1964825501511404;",
        // "  color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;",
        // "  color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;",
        // "  color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;",
        // "  color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;",
        // "  color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;",
        // "  color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;",
        // "  return color;",
        // "}",

        // "vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {",
        // "  vec4 color = vec4(0.0);",
        // "  vec2 off1 = vec2(1.3846153846) * direction;",
        // "  vec2 off2 = vec2(3.2307692308) * direction;",
        // "  color += texture2D(image, uv) * 0.2270270270;",
        // "  color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;",
        // "  color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;",
        // "  color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;",
        // "  color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;",
        // "  return color;",
        // "}",

        "vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {",
        "  vec4 color = vec4(0.0);",
        "  vec2 off1 = vec2(1.3333333333333333) * direction;",
        "  color += texture2D(image, uv) * 0.29411764705882354;",
        "  color += texture2D(image, uv + (off1 / resolution)) * 0.35294117647058826;",
        "  color += texture2D(image, uv - (off1 / resolution)) * 0.35294117647058826;",
        "  return color; ",
        "}",

        "void main(void) {",
        "  vec4 col = blur5(texture, vUv, resolution, direction);",
        "  gl_FragColor = col;",
        "}",

      ].join("\n");
    },
    getFragmentShaderUniforms: function() {
      return [
        "texture",
        "resolution", // 画面の解像度 as vec2
        "direction", // ブレ方向 as vec2
      ];
    },

    _accessor: {
      resolution: {
        get: function() {
          return this.uniformValues["resolution"];
        },
        set: function(v) {
          this.uniformValues["resolution"] = v;
        },
      },
    },

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.ListNode", {
    superClass: "phina.glfilter.Node",

    nodes: null,

    init: function() {
      this.superInit();
      this.nodes = [];
    },

    _setup: function() {
      var gl = this.layer.gl;
      var sizeInfo = this.layer.sizeInfo;

      this.framebuffer0 = phigl.Framebuffer(gl, sizeInfo.width, sizeInfo.height);
      this.framebuffer1 = phigl.Framebuffer(gl, sizeInfo.width, sizeInfo.height);
    },

    isEnabled: function() {
      var count = this.nodes.filter(function(n) {
        return n.enabled;
      }).length;
      return this._enabled && count > 0;
    },

    addNode: function(node) {
      this.nodes.push(node);
      node.layer = this.layer;
    },

    _render: function(src, dst, sizeInfo) {
      var nodes = this.nodes.filter(function(n) {
        return n.enabled;
      });

      if (nodes.length === 1) {
        nodes.first.render(src, dst, sizeInfo);
      } else if (nodes.length > 0) {
        nodes.first.render(src, this.framebuffer0, sizeInfo);
        for (var i = 1; i < nodes.length - 1; i++) {
          nodes[i].render(this.framebuffer0, this.framebuffer1, sizeInfo);
          var t = this.framebuffer0;
          this.framebuffer0 = this.framebuffer1;
          this.framebuffer1 = t;
        }
        nodes.last.render(this.framebuffer0, dst, sizeInfo);
      }
    },

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.MixNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function(weight0, weight1) {
      this.superInit();
      this.uniformValues["weight0"] = weight0;
      this.uniformValues["weight1"] = weight1;
    },

    render: function(src0, src1, dst, sizeInfo) {
      var gl = this.layer.gl;

      dst.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.screen.uniforms["texture0"].setValue(0).setTexture(src0.texture);
      this.screen.uniforms["texture1"].setValue(1).setTexture(src1.texture);
      this.uniformValues
        .forIn(function(key, value) {
          if (key === "texture0" || key === "texture1") return;
          this.screen.uniforms[key].setValue(value);
        }.bind(this));
      this.screen.draw();

      gl.flush();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture0;",
        "uniform sampler2D texture1;",
        "uniform float weight0;",
        "uniform float weight1;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 col0 = texture2D(texture0, vUv);",
        "  vec4 col1 = texture2D(texture1, vUv);",

        "  vec3 srcColor = col1.rgb * col1.a;",
        "  vec3 dstColor = col0.rgb * 1.0;",
        "  float srcAlpha = col1.a * 1.0;",
        "  float dstAlpha = col0.a * 1.0;",
        "  gl_FragColor = vec4(srcColor + dstColor, srcAlpha + dstAlpha);",
        "}",
      ].join("\n");
    },
    getFragmentShaderUniforms: function() {
      return ["texture0", "texture1", "weight0", "weight1"];
    },
  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.MonotoneNode", {
    superClass: "phina.glfilter.ShaderNode",

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

  phina.define("phina.glfilter.MultiGaussianNode", {
    superClass: "phina.glfilter.ListNode",

    init: function(unit, count) {
      this.superInit();

      this.unit = unit || 0;
      this.count = count || 4;

      this.on("prerender", function() {
        this.setUnit();
      });
    },

    setUnit: function() {
      this.nodes.forEach(function(n, i) {
        if (i % 2 === 0) {
          n.uniformValues["direction"] = [i * this.unit, 0];
        } else {
          n.uniformValues["direction"] = [0, i * this.unit];
        }
      }.bind(this));
    },

    _setup: function() {
      this.superMethod("_setup");

      var sizeInfo = this.layer.sizeInfo;
      for (var i = 0; i < this.count; i++) {
        const gfH = GaussianNode();
        gfH.enabled = true;
        gfH.uniformValues["resolution"] = [sizeInfo.width, sizeInfo.height];
        this.addNode(gfH);

        const gfV = GaussianNode();
        gfV.enabled = true;
        gfV.uniformValues["resolution"] = [sizeInfo.width, sizeInfo.height];
        this.addNode(gfV);
      }

      this.setUnit();
    },

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.Node", {
    superClass: "phina.util.EventDispatcher",

    /** @type {GLFilterLayer} */
    _layer: null,

    _enabled: true,

    init: function() {
      this.superInit();
    },

    isEnabled: function() {
      return this._enabled;
    },
    setEnabled: function(v) {
      this._enabled = v;
    },

    setLayer: function(layer) {
      this._layer = layer;
      this._setup();

      return this;
    },

    _setup: function() {
      return this;
    },

    /**
     * @param src {{texture:phigl.Texture}}
     * @param dst {phina.glfilter.Node}
     */
    render: function(src, dst, sizeInfo) {
      this.flare("prerender", { sizeInfo: sizeInfo });
      this._render(src, dst, sizeInfo);
      this.flare("postrender");
    },

    _render: function(src, dst, sizeInfo) {},

    addTo: function(layer) {
      layer.addNode(this);
      return this;
    },

    _accessor: {
      enabled: {
        get: function() {
          return this.isEnabled();
        },
        set: function(v) {
          this.setEnabled(v);
        },
      },
      layer: {
        get: function() {
          return this._layer;
        },
        set: function(v) {
          this.setLayer(v);
        },
      },
    }

  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.ReverseNode", {
    superClass: "phina.glfilter.ShaderNode",

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
    superClass: "phina.glfilter.ShaderNode",

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

  // var projectionMatrix = mat4.create();
  // var viewMatrix = mat4.create();
  // var modelMatrix = mat4.create();
  // var mvpMatrix = mat4.create();
  // mat4.ortho(projectionMatrix, -0.5, 0.5, -0.5, 0.5, 0.9, 1.1);
  // mat4.lookAt(viewMatrix, [0, 0, 1], [0, 0, 0], [0, 1, 0]);
  // mat4.mul(mvpMatrix, projectionMatrix, viewMatrix);
  // mat4.mul(mvpMatrix, mvpMatrix, modelMatrix);
  var mvpMatrix = new Float32Array([ //
    2, 0, 0, 0, //
    0, 2, 0, 0, //
    0, 0, -10, 0, //
    0, 0, 0, 1, //
  ]);

  phina.define("phina.glfilter.ShaderNode", {
    superClass: "phina.glfilter.Node",

    uniformValues: null,

    init: function() {
      this.superInit();
      this.uniformValues = {};
    },

    _setup: function() {
      var gl = this.layer.gl;
      this.screen = phigl.Drawable(gl)
        .setProgram(this._createProgram(gl))
        .setGeometry(phigl.PlaneXY({
          width: 1,
          height: 1,
          normalsEnabled: false,
        }))
        .declareUniforms([].concat(this.getVertexShaderUniforms(), this.getFragmentShaderUniforms()));
      this.screen.uniforms["mvpMatrix"].setValue(mvpMatrix);

      return this;
    },

    _render: function(src, dst) {
      var gl = this.layer.gl;

      dst.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.screen.uniforms["texture"].setValue(0).setTexture(src.texture);
      this.uniformValues
        .forIn(function(key, value) {
          if (key === "texture") return;
          this.screen.uniforms[key].setValue(value);
        }.bind(this));
      this.screen.draw();

      gl.flush();

      return this;
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
    superClass: "phina.glfilter.ShaderNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      // filp Y axis
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
    superClass: "phina.glfilter.ShaderNode",

    init: function() {
      this.superInit();
    },

    _render: function(src /*, dst*/ ) {
      var gl = this.layer.gl;

      phigl.Framebuffer.unbind(gl);
      gl.clear(gl.COLOR_BUFFER_BIT);

      this.screen.uniforms["texture"].setValue(0).setTexture(src.texture);
      this.screen.draw();

      gl.flush();
    },
  });

});
phina.namespace(function() {

  phina.define("phina.glfilter.ZoomBlurNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function() {
      this.superInit();
    },

    getFragmentShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture;",
        "uniform float x;",
        "uniform float y;",
        "uniform float strength;",

        "varying vec2 vUv;",

        "const float nFrag = 1.0 / 30.0;",

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
      return ["texture", "x", "y", "strength"];
    },

    _accessor: {
      x: {
        get: function() {
          return this.uniformValues["x"];
        },
        set: function(v) {
          this.uniformValues["x"] = v;
        },
      },
      y: {
        get: function() {
          return this.uniformValues["y"];
        },
        set: function(v) {
          this.uniformValues["y"] = v;
        },
      },
      strength: {
        get: function() {
          return this.uniformValues["strength"];
        },
        set: function(v) {
          this.uniformValues["strength"] = v;
        },
      },
    },

  });

});
//# sourceMappingURL=phina.glfilter.js.map
