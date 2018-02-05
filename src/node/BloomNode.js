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

    _render: function(src, dst) {
      this.luminanceNode.render(src, this.bloomPath0);
      this.gaussianNode.render(this.bloomPath0, this.bloomPath1);
      this.mixNode.render(src, this.bloomPath1, dst);
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