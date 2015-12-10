phina.namespace(function() {

  phina.define("phina.glfilter.BrightnessContrastNode", {
    superClass: "phina.glfilter.ShaderNode",

    brightness: 0,
    contrast: 0,

    init: function(gl, params) {
      this.superInit(gl, params);
    },

    getUniformData: function() {
      return [{
        name: "texture0",
        type: "texture",
      }, {
        name: "brightness",
        type: "float",
      }, {
        name: "contrast",
        type: "float",
      }, ];
    },

    getShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture0;",
        "uniform float brightness;",
        "uniform float contrast;",

        "varying vec2 vUv;",

        "void main(void){",
        "  vec4 color = texture2D(texture0, vUv);",
        "  color.rgb += brightness;",
        "  if (contrast > 0.0) {",
        "    color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;",
        "  } else {",
        "    color.rgb = (color.rgb - 0.5) * (1.0 - contrast) + 0.5;",
        "  }",
        "  gl_FragColor = color;",
        "}",
      ].join("\n");
    },

    setUniforms: function(gl) {
      this.setUniform(gl, "brightness", this.brightness);
      this.setUniform(gl, "contrast", this.contrast);
    },

  });

  var floatToString = function(f) {
    return (f % 1) ? "" + f : "" + f + ".0";
  };

});
