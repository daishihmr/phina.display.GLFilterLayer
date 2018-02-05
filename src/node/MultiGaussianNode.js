phina.namespace(function() {

  phina.define("phina.glfilter.MultiGaussianNode", {
    superClass: "phina.glfilter.ListNode",

    init: function(unit, count) {
      this.superInit();

      this.unit = unit || 0;
      this.count = count || 4;

      this.on("prerender", function() {
        this.setUnit();
      });
    },

    setUnit: function() {
      this.nodes.forEach(function(n, i) {
        if (i % 2 === 0) {
          n.uniformValues["direction"] = [i * this.unit, 0];
        } else {
          n.uniformValues["direction"] = [0, i * this.unit];
        }
      }.bind(this));
    },

    _setup: function() {
      this.superMethod("_setup");

      var sizeInfo = this.layer.sizeInfo;
      for (var i = 0; i < this.count; i++) {
        const gfH = GaussianNode();
        gfH.enabled = true;
        gfH.uniformValues["resolution"] = [sizeInfo.width, sizeInfo.height];
        this.addNode(gfH);

        const gfV = GaussianNode();
        gfV.enabled = true;
        gfV.uniformValues["resolution"] = [sizeInfo.width, sizeInfo.height];
        this.addNode(gfV);
      }

      this.setUnit();
    },

  });

});