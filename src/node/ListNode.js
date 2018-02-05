phina.namespace(function() {

  phina.define("phina.glfilter.ListNode", {
    superClass: "phina.glfilter.Node",

    nodes: null,

    init: function() {
      this.superInit();
      this.nodes = [];
    },

    _setup: function() {
      var gl = this.layer.gl;
      var sizeInfo = this.layer.sizeInfo;

      this.framebuffer0 = phigl.Framebuffer(gl, sizeInfo.width, sizeInfo.height);
      this.framebuffer1 = phigl.Framebuffer(gl, sizeInfo.width, sizeInfo.height);
    },

    isEnabled: function() {
      var count = this.nodes.filter(function(n) {
        return n.enabled;
      }).length;
      return this._enabled && count > 0;
    },

    addNode: function(node) {
      this.nodes.push(node);
      node.layer = this.layer;
    },

    _render: function(src, dst) {
      var nodes = this.nodes.filter(function(n) {
        return n.enabled;
      });

      if (nodes.length === 1) {
        nodes.first.render(src, dst);
      } else if (nodes.length > 0) {
        nodes.first.render(src, this.framebuffer0);
        for (var i = 1; i < nodes.length - 1; i++) {
          nodes[i].render(this.framebuffer0, this.framebuffer1);
          var t = this.framebuffer0;
          this.framebuffer0 = this.framebuffer1;
          this.framebuffer1 = t;
        }
        nodes.last.render(this.framebuffer0, dst);
      }
    },

  });

});