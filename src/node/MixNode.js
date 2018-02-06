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