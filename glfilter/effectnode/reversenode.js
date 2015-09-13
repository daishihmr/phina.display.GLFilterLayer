phina.namespace(function() {

  phina.define("phina.glfilter.ReverseNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function(gl, params) {
      this.superInit(gl, params);
    },

    getShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture0;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  vec4 tex = texture2D(texture0, vUv);",
        "  gl_FragColor = vec4(1.0 - tex.rgb, tex.a);",
        "}",
      ].join("\n");
    },

  });

});
