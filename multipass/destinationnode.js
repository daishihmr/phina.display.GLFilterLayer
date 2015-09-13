phina.namespace(function() {

  phina.define("phina.display.glfilterlayer.DestinationNode", {

    init: function(gl, width, height) {
      this.width = width;
      this.height = height;
    },
    _createScreen: function(gl, width, height) {
      return null;
    },

    connectTo: function() {
      // なにもしない
    },

    render: function(gl, prevScreen) {
      // TODO bind attribute

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, prevScreen.texture);
      this.setUniform("texture", 0);

      // TODO bind uniform

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.width, this.height);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();
    }

  });

});
