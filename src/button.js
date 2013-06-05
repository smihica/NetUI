var Button = classify('Button', {
  parent: ElementBase,
  property: {},
  static: {
    style: {
      color: {
        base: _fashion_fill('#999'),
        foreground: _fashion_fill('#CCC')
      }
    },
    size: { x: 16, y: 16 },
    icons: {},
    new_button: function(name, icon_url) {
      this.icons[name] = icon_url;
    }
  },
  method: {
    init: function() {
      this.__super__().init.apply(this, arguments);
    },
    make_instance: function(parent, options) {
      var icon_url = Button.icons[options.name];
      if (!icon_url)
        throw new Error('Unknown button\'s name "'+ options.name +'".');
      var shape = {
        points: new Fashion.PathData(
          [["M", 0, 0], ["L", Button.size.x, 0],
           ["L", Button.size.x, Button.size.y],
           ["L", 0, Button.size.y], ["Z"]]),
        style: {
          stroke: null,
          fill: new Fashion.ImageTileFill(new Fashion.ImageData(icon_url))
        }
      };
      var d = new Fashion.Path(shape);
      if (options.zIndex) d.zIndex(options.zIndex);
      return d;
    },
    origin_pos: function(origin) {
      var p = this.parent.position();
      var s = this.parent.size();
      var o = origin.split('-');
      return {
        x: p.x + (o[0] === 'left' ? 0 : s.x),
        y: p.y + (o[1] === 'top'  ? 0 : s.y)
      };
    },
    parent_changed: function() {
      var s   = this.parent.size();
      var origin = this.origin_pos(this.options.origin);
      var offset = this.options.offset;
      this.d.position({
        x: (origin.x + (Math.abs(offset.x) < 1 ? offset.x * s.x : offset.x)),
        y: (origin.y + (Math.abs(offset.y) < 1 ? offset.y * s.y : offset.y))
      });
      var z   = this.parent.zIndex() + 1;
      this.d.zIndex(z);
    },
    click: function(e) {
      if (this.options.onclick) this.options.onclick(this.parent, e);
    }
  }
});

Button.new_button('plus', 'plus_icon.png');
Button.new_button('setting', 'setting_icon.png');