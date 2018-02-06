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