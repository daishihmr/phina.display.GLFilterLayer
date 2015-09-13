phina.namespace(function() {
  
  phina.define("phina.glfilter.SceneRenderNode", {
    superClass: "phina.glfilter.ShaderNode",
    
    init: function(gl) {
      this.superInit(gl);
      this.texture0 = gl.createTexture();
    },
    
    /**
     * @param  {HTMLCanvasElement} texture
     */
    render: function(gl, texture) {
      gl.useProgram(this.program);
      this.setAttributes(gl);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.setUniform(gl, "texture0", 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.screen.frameBuffer);
      gl.viewport(0, 0, this.width, this.height);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      if (this.nextNode) {
        this.nextNode.render(gl, this.screen);
      }
    }

  });

});
