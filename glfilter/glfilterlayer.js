phina.namespace(function() {

  phina.define("phina.glfilter.GLFilterLayer", {
    superClass: 'phina.display.CanvasElement',

    /**
     * 子孫要素の描画の面倒を自分で見る
     */
    childrenVisible: false,

    /** 子孫要素を普通に描画するためのキャンバス */
    canvas2d: null,
    /** canvas2dに描画するレンダラー */
    renderer2d: null,
    /** 
     * canvas2dの内容をWebGLテクスチャとして使うためのキャンバス
     * 幅と高さが2の累乗
     */
    textureCanvas: null,
    /** WebGL描画を行うためのcanvas要素 */
    domElement: null,

    /** WebGLコンテキスト */
    gl: null,

    /** canvas2d塗りつぶし用 */
    backgroundColor: "white",

    init: function(params) {
      this.superInit();

      this.$extend(phina.glfilter.GLFilterLayer.defaultParams, params);

      this.canvas2d = phina.graphics.Canvas();
      this.canvas2d.setSize(this.width, this.height);

      this.renderer2d = phina.display.CanvasRenderer(this.canvas2d);

      this.textureCanvas = phina.graphics.Canvas();
      // 見える化
      // document.body.appendChild(this.textureCanvas.domElement);

      // 最適なサイズを計算する
      var m = Math.max(this.width, this.height);
      var size = Math.pow(2, Math.floor(Math.log(m) / Math.log(2)) + 1);
      this.textureCanvas.setSize(size, size);

      this.domElement = document.createElement("canvas");
      this.domElement.width = size;
      this.domElement.height = size;
      // 見える化
      // document.body.appendChild(this.domElement);

      var gl = this.gl = this.domElement.getContext("webgl");
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

      this.headNode = phina.glfilter.SceneRenderNode(gl);
      this.destNode = phina.glfilter.DestinationNode(gl, {
        width: size,
        height: size
      });

      this.headNode.connectTo(this.destNode);
    },

    draw: function(canvas) {
      var tex = this.textureCanvas;

      if (this.backgroundColor) {
        this.canvas2d.clearColor(this.backgroundColor);
        tex.clearColor(this.backgroundColor);
      } else {
        this.canvas2d.clear();
        tex.clear();
      }

      // 自分の子孫をcanvas2dに描画する
      if (this.children.length > 0) {
        var tempChildren = this.children.slice();
        for (var i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderer2d.renderObject(tempChildren[i]);
        }
      }

      // 描画したcanvasの内容をtextureCanvasへリサイズして転写
      var c2d = this.canvas2d.domElement;
      if (c2d.width < c2d.height) {
        var destWidth = tex.width * c2d.height / tex.height;
        tex.context.drawImage(
          c2d,
          0, 0, c2d.width, c2d.height, (tex.width - destWidth) * 0.5, 0, destWidth, tex.height
        );
      } else {
        var destHeight = tex.height * c2d.width / tex.width;
        tex.context.drawImage(
          c2d,
          0, 0, c2d.width, c2d.height,
          0, (tex.height - destHeight) * 0.5, tex.width, destHeight
        );
      }

      // WebGL描画
      this.headNode.render(this.gl, tex.domElement);

      // glに描いたものをcanvasに転写
      var glcanvas = this.domElement;
      if (c2d.width < c2d.height) {
        var srcWidth = tex.width * c2d.height / tex.height;
        canvas.context.drawImage(
          glcanvas, (tex.width - srcWidth) * 0.5, 0, srcWidth, tex.height,
          0, 0, canvas.width, canvas.height
        );
      } else {
        var srcHeight = tex.height * c2d.width / tex.width;
        canvas.context.drawImage(
          glcanvas,
          0, (tex.height - srcHeight) * 0.5, tex.width, srcHeight,
          0, 0, canvas.width, canvas.height
        );
      }
    },

    _static: {
      defaultParams: {
        width: 640,
        height: 960,
      }
    }
  });

});
