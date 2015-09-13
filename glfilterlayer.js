phina.namespace(function() {

  phina.define("phina.display.GLFilterLayer", {
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

    /** シェーダー */
    program: null,
    /** attribute変数の名前、要素サイズ、ロケーションを保持する */
    attributes: null,
    /** uniform変数の名前、型、ロケーションを保持する */
    uniforms: null,

    /** 頂点の座標 */
    positionVbo: null,
    /** 頂点のUV座標 */
    uvVbo: null,
    /** 子孫要素を描画したテクスチャ */
    texture0: null,

    init: function(params) {
      this.superInit();

      this.$extend(phina.display.GLFilterLayer.defaultParams, params);

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

      this.gl = this.domElement.getContext("webgl");

      this._setup(this.gl);
    },

    draw: function(canvas) {
      if (this.backgroundColor) {
        this.canvas2d.clearColor(this.backgroundColor);
      } else {
        this.canvas2d.clear();
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
      var tex = this.textureCanvas;
      if (c2d.width < c2d.height) {
        var destWidth = tex.width * c2d.height / tex.height;
        tex.context.drawImage(
          c2d,
          0, 0, c2d.width, c2d.height,
          (tex.width - destWidth) * 0.5, 0, destWidth, tex.height
        );
      } else {
        var destHeight = tex.height * c2d.width / tex.width;
        tex.context.drawImage(
          c2d,
          0, 0, c2d.width, c2d.height,
          0, (tex.height - destHeight) * 0.5, tex.width, destHeight
        );
      }

      var gl = this.gl;

      gl.useProgram(this.program);
      this.setAttributes();

      // textureCanvasをテクスチャとして使う
      this._rebindTexture(this.textureCanvas.domElement);

      // WebGL描画実行
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.flush();

      // glに描いたものをcanvasに転写
      var glcanvas = this.domElement;
      if (c2d.width < c2d.height) {
        var srcWidth = tex.width * c2d.height / tex.height;
        canvas.context.drawImage(
          glcanvas,
          (tex.width - srcWidth) * 0.5, 0, srcWidth, tex.height,
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
    
    /**
     * オフスクリーンレンダリング用の描画領域を新たに生成する
     */
    createOffScreen: function(width, height) {
      // TODO
      return null;
    },

    /**
     * いろいろ初期化
     */
    _setup: function() {
      var gl = this.gl;
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      this._setupProgram();
      this._setupVbo();
      this._setupTexture();
    },

    /**
     * シェーダーをコンパイルし、attributeとuniformのロケーションを取得する
     */
    _setupProgram: function() {
      var gl = this.gl;

      var vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, VS_SOURCE);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(vs));
      }

      var fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, this.shaderSource);
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

      this.attributes = this.attributeData.reduce(function(result, attr) {
        result[attr.name] = {
          size: attr.size,
          location: gl.getAttribLocation(program, attr.name),
        };
        return result;
      }, {});

      this.uniforms = this.uniformData.reduce(function(result, uni) {
        result[uni.name] = {
          type: uni.type,
          location: gl.getUniformLocation(program, uni.name),
        };
        return result;
      }, {});

      this.program = program;
    },

    /**
     * VBOを作成する
     * ４つの頂点の位置とUV
     */
    _setupVbo: function() {
      var gl = this.gl;

      var positions = new Float32Array([
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].flatten());

      var uvs = new Float32Array([
        [0, 1],
        [1, 1],
        [0, 0],
        [1, 0],
      ].flatten());

      this.positionVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      this.uvVbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvVbo);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },

    /**
     * テクスチャの初期化
     */
    _setupTexture: function() {
      var gl = this.gl;
      var img = this.textureCanvas.domElement;

      gl.activeTexture(gl.TEXTURE0);

      this.texture0 = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },

    /**
     * テクスチャを再度WebGLに転送する
     */
    _rebindTexture: function(img) {
      var gl = this.gl;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);

      this.setUniform("texture0", 0);
    },

    /**
     * attribute変数をバインドする
     */
    setAttributes: function() {
      var gl = this.gl;

      var position = this.attributes.position;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionVbo);
      gl.enableVertexAttribArray(position.location);
      gl.vertexAttribPointer(position.location, position.size, gl.FLOAT, false, 0, 0);

      var uv = this.attributes.uv;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvVbo);
      gl.enableVertexAttribArray(uv.location);
      gl.vertexAttribPointer(uv.location, uv.size, gl.FLOAT, false, 0, 0);
    },

    /**
     * uniform変数をバインドする
     */
    setUniform: function(name, value) {
      var gl = this.gl;
      var uni = this.uniforms[name];

      if (uni) {
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

    _static: {
      defaultParams: {

        width: 640,
        height: 960,

        /**
         * attribute変数のメタ情報
         */
        attributeData: [{
          name: "position",
          size: 2,
        }, {
          name: "uv",
          size: 2,
        }, ],

        /**
         * uniform変数のメタ情報
         */
        uniformData: [{
          name: "texture0",
          type: "texture",
        }, ],

        /**
         * フラグメントシェーダ―のソースコード
         * デフォルトのものはテクスチャをそのまま出力する
         */
        shaderSource: [
          "precision mediump float;",

          "uniform sampler2D texture0;",

          "varying vec2 vUv;",

          "void main(void) {",
          "  gl_FragColor = texture2D(texture0, vUv);",
          "}",
        ].join("\n")

      }
    }
  });

  /**
   * 頂点シェーダ―のソースコード
   */
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
