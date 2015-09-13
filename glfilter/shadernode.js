phina.namespace(function() {

  phina.define("phina.glfilter.ShaderNode", {

    nextNode: null,

    screen: null,
    program: null,
    attributes: null,
    uniforms: null,

    _positionVbo: null,
    _uvVbo: null,

    init: function(gl, params) {
      this.$extend(phina.glfilter.ShaderNode.defaultParams, params);

      this.screen = this._createScreen(gl, this.width, this.height);

      this._setupProgram(gl);
      this._setupVbo(gl);
    },
    _createScreen: function(gl, width, height) {
      return phina.glfilter.Screen(gl, width, height);
    },

    connectTo: function(nextNode) {
      this.nextNode = nextNode;
      return nextNode;
    },

    /** for override */
    getAttributeData: function() {
      return [{
        name: "position",
        size: 2,
      }, {
        name: "uv",
        size: 2,
      }, ];
    },

    /** for override */
    getUniformData: function() {
      return [{
        name: "texture0",
        type: "texture",
      }, ];
    },

    /** for override */
    getShaderSource: function() {
      return [
        "precision mediump float;",

        "uniform sampler2D texture0;",

        "varying vec2 vUv;",

        "void main(void) {",
        "  gl_FragColor = texture2D(texture0, vUv);",
        "}",
      ].join("\n");
    },

    render: function(gl, prevScreen) {
      gl.useProgram(this.program);
      this.setAttributes(gl);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, prevScreen.texture);
      this.setUniform(gl, "texture0", 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.screen.frameBuffer);
      gl.viewport(0, 0, this.width, this.height);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (this.nextNode) {
        this.nextNode.render(gl, this.screen);
      }
    },

    setAttributes: function(gl) {
      var position = this.attributes.position;
      gl.bindBuffer(gl.ARRAY_BUFFER, this._positionVbo);
      gl.enableVertexAttribArray(position.location);
      gl.vertexAttribPointer(position.location, position.size, gl.FLOAT, false, 0, 0);

      var uv = this.attributes.uv;
      gl.bindBuffer(gl.ARRAY_BUFFER, this._uvVbo);
      gl.enableVertexAttribArray(uv.location);
      gl.vertexAttribPointer(uv.location, uv.size, gl.FLOAT, false, 0, 0);
    },

    setUniform: function(gl, name, value) {
      var uni = this.uniforms[name];

      if (uni) {
        gl.useProgram(this.program);
        switch (uni.type) {
          case "float":
            gl.uniform1f(uni.location, value);
            break;
          case "int":
          case "texture":
            gl.uniform1i(uni.location, value);
            break;
          case "vec2":
            gl.uniform2fv(uni.location, value);
            break;
          case "vec3":
            gl.uniform3fv(uni.location, value);
            break;
          case "vec4":
          case "color":
            gl.uniform4fv(uni.location, value);
            break;
          case "mat3":
            gl.uniformMatrix3fv(uni.location, false, value);
            break;
          case "mat4":
            gl.uniformMatrix4fv(uni.location, false, value);
            break;
        }
      }
    },

    _setupProgram: function(gl) {
      var vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VS_SOURCE);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(vs));
      }

      var fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, this.getShaderSource());
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(fs));
      }

      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.useProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
      }

      this.attributes = this.getAttributeData().reduce(function(result, attr) {
        result[attr.name] = {
          size: attr.size,
          location: gl.getAttribLocation(program, attr.name),
        };
        return result;
      }, {});

      this.uniforms = this.getUniformData().reduce(function(result, uni) {
        result[uni.name] = {
          type: uni.type,
          location: gl.getUniformLocation(program, uni.name),
        };
        return result;
      }, {});

      this.program = program;
    },

    _setupVbo: function(gl) {
      var positions = new Float32Array([
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].flatten());

      var uvs = new Float32Array([
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].flatten());

      this._positionVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._positionVbo);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this._uvVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._uvVbo);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },

    _static: {
      defaultParams: {

        width: 512,
        height: 512,

      }
    }

  });

  var VS_SOURCE = [
    "attribute vec2 position;",
    "attribute vec2 uv;",

    "varying vec2 vUv;",

    "void main(void) {",
    "  vUv = uv;",
    "  gl_Position = vec4(position, 0.0, 1.0);",
    "}",
  ].join("\n");

});
