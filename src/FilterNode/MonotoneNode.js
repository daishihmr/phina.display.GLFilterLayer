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