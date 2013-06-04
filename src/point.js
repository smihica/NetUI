var Point = classify('Point', {
  parent: ElementBase,
  static: {
    points:    {},
    snap_radius_scale: 2,
    x_positions: SortedList(),
    y_positions: SortedList(),
    style: {
      base: {
        stroke: {width: 1, color: new Fashion.Color('#000')},
        fill:   new Fashion.FloodFill(new Fashion.Color('#FFF')),
        cursor: 'pointer'
      },
      highlight: {
        stroke: {width: 3, color: new Fashion.Color('#FF0')},
        fill:   new Fashion.FloodFill(new Fashion.Color('#F00')),
        cursor: 'pointer'
      }
    },
    last_hovering_points: []
  },
  property: {
    d:      null,
    stage:  null,
    options:  null,
    offset_position_drag_start: {x: 0, y: 0},
    last_pos: { x: 0, y: 0 },
    current_pipe: null
  },
  method: {
    init: function(parent, options) {
      this.options = options;
      this.__super__().init.apply(this, arguments);
      var id = this.d.id;
      Point.points[id] = this;
    },
    make_instance: function(parent, options) {
      var d =  new Fashion.Circle({
        position: {x: 0, y: 0},
        size:     {x: this.options.radius*2, y: this.options.radius*2},
        style:    this.get_style('base'),
      });
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
      var s = this.parent.size();
      var origin = this.origin_pos(this.options.origin);
      var offset = this.options.offset;
      var pos = {
        x: (origin.x + (Math.abs(offset.x) < 1 ? offset.x * s.x : offset.x)) - this.options.radius,
        y: (origin.y + (Math.abs(offset.y) < 1 ? offset.y * s.y : offset.y)) - this.options.radius
      };
      Point.x_positions.replace(this.last_pos.x, this, pos.x, true);
      Point.y_positions.replace(this.last_pos.y, this, pos.y, true);
      this.last_pos = pos;
      this.change({
        position: pos,
        zIndex:   this.parent.zIndex() + 1
      });
    },
    connectable_p: function(t) {
      return (t !== this && t.parent !== this.parent &&
              (!this.options.connect_filter || this.options.connect_filter(t)));
    },
    mouseup:   function(e) { this.stylize('base'); },
    mouseover: function(e) { this.stylize('highlight');  },
    mouseout:  function(e) { this.stylize('base'); },
    click:     function(e) { this.parent.click(e); },
    drag_start: function(e) {
      this.current_pipe = new Pipe(this, {
        style: this.options.pipe_style
      });
      this.children.push(this.current_pipe);
      this.parent.drag_start(e);
      this.offset_position_drag_start = e.offsetPosition;
      Point.last_hovering_points = [];
    },
    drag: function(e) {
      this.current_pipe.drag_by_parent(e);
      var end = e.logicalPosition;
      var range = (this.options.radius * Point.snap_radius_scale);
      var last_h = Point.last_hovering_points;
      var h = Point.x_positions.range_get(end.x - range, end.x + range);
      h = Point.y_positions.range_get(end.y - range, end.y + range, h);
      for (var i=0, l=last_h.length; i<l; i++) last_h[i].stylize('base');
      for (var i=0, l=h.length; i<l; i++) {
        if (this.connectable_p(h[i])) h[i].stylize('highlight');
        else { h.splice(i, 1); --l; --i; }
      }
      Point.last_hovering_points = h;
    },
    drag_end: function(e) {
      var h = Point.last_hovering_points;
      for (var i=0, l=h.length; i<l; i++) h[i].stylize('base');
      if (h.length) {
        var target = h[0];
        this.connect(target, this.current_pipe);
      } else {
        this.children.pop();
        this.current_pipe.erase();
      }
    },
    connect: function(point, pipe) {
      point.children.push(pipe);
      pipe.reset_parent(this, point);
    },
    connecting_points: function() {
      var rt = [];
      for (var i=0, l=this.children.length; i<l; i++) {
        for (var j=0; j<2; j++) {
          var p = this.children[i].parents[j];
          if (p && p !== this) rt.push(p);
        }
      }
      return rt;
    },
    dump: function(backref_p) {
      var connections = [];
      var pts = this.connecting_points();
      var my_idx = this.stage.get_elem_index(this, NetUI.Node);
      for (var i=0, l=pts.length; i<l; i++) {
        var p = pts[i];
        var node_idx = this.stage.get_elem_index(p.parent, NetUI.Node);
        if (backref_p || node_idx < my_idx)
          connections.push([node_idx, p.name]);
      }
      return {
        type:     this.options.type,
        position: {
          origin: this.options.origin,
          offset: this.options.offset
        },
        connections: connections,
      }
    }
  },
  after: {
    init: function(parent, options) {
      var cs = options.connections;
      if (cs) {
        for (var i=0, l=cs.length; i<l; i++) {
          var c = cs[i];
          var node_idx = c[0], name = c[1];
          var node = this.stage.get_elem_by_index(node_idx, NetUI.Node);
          var point = node.get_point_by_name(name);
          var pipe  = new Pipe(this, {
            style: this.options.pipe_style
          });
          this.children.push(pipe);
          this.connect(point, pipe);
        }
      }
    }
  }
});