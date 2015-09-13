phina.namespace(function() {

  phina.define("phina.glfilter.DestinationNode", {
    superClass: "phina.glfilter.ShaderNode",

    init: function(gl, params) {
      this.superInit(gl, params);
    },
    _createScreen: function() {
      // なにも返さない
      return null;
    },

    connectTo: function() {
      // なにもしない
      return null;
    },

    render: function(gl, prevScreen) {
      gl.useProgram(this.program);
      this.setAttributes(gl);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, prevScreen.texture);
      this.setUniform(gl, "texture", 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();
    }

  });

});
