phina.namespace(function() {

  phina.define("phina.glfilter.ZoomBlurNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function(gl, params) {
      this.superInit(gl, params);
    },

    getUniformData: function() {
      return [{
        name: "texture0",
        type: "texture",
      }, {
        name: "x",
        type: "float",
      }, {
        name: "y",
        type: "float",
      }, ];
    },

    getShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture0;",
        "uniform float x;",
        "uniform float y;",

        "varying vec2 vUv;",

        "const float nFrag = 1.0 / 30.0;",
        "const float strength = 8.0;",

        "float rnd(vec3 scale, float seed){",
        "    return fract(sin(dot(gl_FragCoord.stp + seed, scale)) * 43758.5453 + seed);",
        "}",

        "void main(void){",
        "    vec2  center = vec2(x / {0}, 1.0 - y / {1});".format(floatToString(this.width), floatToString(this.height)),
        "    vec3  destColor = vec3(0.0);",
        "    float random = rnd(vec3(12.9898, 78.233, 151.7182), 0.0);",
        "    vec2  fcc = vUv - center;",
        "    float totalWeight = 0.0;",

        "    for(float i = 0.0; i <= 30.0; i++){",
        "        float percent = (i + random) * nFrag;",
        "        float weight = percent - percent * percent;",
        "        vec2  t = vUv - fcc * percent * strength * nFrag;",
        "        destColor += texture2D(texture0, t).rgb * weight;",
        "        totalWeight += weight;",
        "    }",
        "    gl_FragColor = vec4(destColor / totalWeight, 1.0);",
        "}",
      ].join("\n");
    },

  });

  var floatToString = function(f) {
    return (f % 1) ? "" + f : "" + f + ".0";
  };

});
