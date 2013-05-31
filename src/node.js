var Node = classify('Node', {
  parent: ElementBase,
  static: {
    style: {
      base: {
        stroke: null,
        fill:   new Fashion.FloodFill(new Fashion.Color('#CCC')),
      },
      highlight: {
        stroke: { width: 5, color: new Fashion.Color('#FC0') },
        fill:   new Fashion.FloodFill(new Fashion.Color('#EEE'))
      }
    }
  },
  property: {
    offset_position_drag_start: { x: 0, y: 0 },
    body: null,
    body_size: { x: 0, y: 0 }
  },
  method: {
    init: function(parent, options) {
      this.options = options;
      this.style = this.options.style;
      this.__super__().init.apply(this, arguments);
    },
    add_point: function(options) {
      return this.add_child(new Point(this, options));
    },
    remove_point: function(p) {
      this.remove_child(p);
    },
    make_instance: function(parent, options) {
      var shape = {
        position: options.position,
        size:     options.size === 'auto' ? {x: 0, y: 0} : options.size,
      };
      shape.style  = this.get_style('base');
      shape.corner = {x: 10, y: 10};
      var d = new Fashion.Rect(shape);
      if (options.zIndex) d.zIndex(options.zIndex);
      if (options.body) {
        var self = this;
        var pos = options.position;
        var window_pos = this.stage.elem.position();
        var body = $('<div/>', {id: "body_" + d.id});
        body.html(options.body);
        body.css({
          position: 'absolute',
          left:     window_pos.left + pos.x + (options.padding || 0),
          top:      window_pos.top  + pos.y + (options.padding || 0)
        });
        $(document.body).append(body);
        var w = body.width();
        var h = body.height();
        d.size({
          x: w + (options.padding * 2),
          y: h + (options.padding * 2)
        });
        this.body = body;
        this.body_size = { x: w, y: h };
        this.body.mouseup(function(e){ self.body_mouseup(e); });
      }

      return d;
    },
    click: function(e) {
      this.toggle_select();
    },
    drag_start: function(e) {
      this.select();
      this.offset_position_drag_start = e.offsetPosition;
    },
    drag: function(e) {
      var vp = this.stage.viewport();
      var s = this.size();
      var mp = e.logicalPosition;
      var op = this.offset_position_drag_start;
      this.change({
        position: {
          x: _clip(mp.x - op.x, vp.x - s.x, 0),
          y: _clip(mp.y - op.y, vp.y - s.y, 0)
        }
      });
    },
    body_changed: function(data) {
      var nx = (data) ? data.x : this.body.width();
      var ny = (data) ? data.y : this.body.height();
      this.change({
        size: {
          x: nx + (this.options.padding * 2),
          y: ny + (this.options.padding * 2)
        }
      });
      this.body_size.x = nx; this.body_size.y = ny;
    },
    body_mouseup: function(e) {
      var s = this.body_size;
      var nx = this.body.width(), ny = this.body.height();
      if (s.x != nx || s.y != ny) this.body_changed({x: nx, y: ny});
    },
    mouseover: function(e) {
      if (!this.selecting) this.stylize('hover');
    },
    mouseout: function(e) {
      if (!this.selecting) this.stylize('base');
    },
    mouseup: function(e) {
      if (!this.selecting) this.stylize('base');
    }
  },
  after: {
    change: function(d) {
      if (d.position) {
        var pos = d.position;
        var window_pos = this.stage.elem.position();
        this.body.css({
          left:     window_pos.left + pos.x + (this.options.padding || 0),
          top:      window_pos.top  + pos.y + (this.options.padding || 0)
        });
      }
    },
    erase: function() {
      this.body.remove();
    }
  }
});