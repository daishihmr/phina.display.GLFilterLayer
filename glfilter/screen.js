phina.namespace(function() {

  phina.define("phina.glfilter.Screen", {

    frameBuffer: null,
    depthRenderBuffer: null,
    texture: null,

    init: function(gl, width, height) {
      this.width = width || 512;
      this.height = height || 512;

      this.frameBuffer = gl.createFramebuffer();
      this.texture = gl.createTexture();
      this.depthRenderBuffer = gl.createRenderbuffer();

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

      gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthRenderBuffer);

      gl.bindRenderbuffer(gl.RENDERBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

  });

});
