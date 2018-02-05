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