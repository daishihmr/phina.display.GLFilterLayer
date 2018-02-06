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