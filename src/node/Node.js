phina.namespace(function() {

  phina.define("phina.glfilter.Node", {
    superClass: "phina.util.EventDispatcher",

    /** @type {GLFilterLayer} */
    _layer: null,

    _enabled: true,

    init: function() {
      this.superInit();
    },

    isEnabled: function() {
      return this._enabled;
    },
    setEnabled: function(v) {
      this._enabled = v;
    },

    setLayer: function(layer) {
      this._layer = layer;
      this._setup();

      return this;
    },

    _setup: function() {
      return this;
    },

    /**
     * @param src {{texture:phigl.Texture}}
     * @param dst {phina.glfilter.Node}
     */
    render: function(src, dst) {
      this.flare("prerender");
      this._render(src, dst);
      this.flare("postrender");
    },

    _render: function(src, dst) {},

    addTo: function(layer) {
      layer.addNode(this);
      return this;
    },

    _accessor: {
      enabled: {
        get: function() {
          return this.isEnabled();
        },
        set: function(v) {
          this.setEnabled(v);
        },
      },
      layer: {
        get: function() {
          return this._layer;
        },
        set: function(v) {
          this.setLayer(v);
        },
      },
    }

  });

});