/** @file netui.js { */
(function(window) {

  var NetUI = {};

/** @file util.js { */
/** @file extend_classify.js { */
// Generic definition of setter and getter.
classify.addDirective("accessor", function(context, key, value) {
  context.property['_'+key] = value;
  context.method[key] = function (v) {
    if (0 < arguments.length) this['_'+key] = v;
    return this['_'+key];
  };
  return context;
});

(function() {

  // before / after
  // To enable to use method combination pattern.

  function find_method_recursively(_class, name) {
    return ((_class) ? (_class.prototype[name] || find_method_recursively(_class.__proto__, name)) : null);
  };

  classify.addDirective("after", function(context, key, value) {
    var meth = context.method[key] || find_method_recursively(context.parent, key);
    if (!meth) throw new Error('Declaration Error: after "' + key + '" is given but the target method not found.');
    context.method[key] = function() {
      var rt = meth.apply(this, arguments);
      value.apply(this, arguments);
      return rt;
    };
    return context;
  });

  classify.addDirective("before", function(context, key, value) {
    var meth = context.method[key] || find_method_recursively(context.parent, key);
    if (!meth) throw new Error('Declaration Error: before "' + key + '" is given but the target method not found.');
    context.method[key] = function() {
      value.apply(this, arguments);
      var rt = meth.apply(this, arguments);
      return rt;
    };
    return context;
  });

})();/** @} */

function _clip(val, max, min) {
  return (val < min) ? min : (max < val) ? max : val;
}

function _rand_color() {
  var c = [];
  for (var i=3; 0<i; i--) {
    c.push('0123456789abcdef'[Math.floor(Math.random() * 16)]);
  }
  return new Fashion.Color('#'+c.join(''));
};

var SortedList = classify('SortedList', {
  static: {
    Tuple: classify('SortedList_Tuple', {
      parent: Array,
      method: {
        arrayize: function() {
          return Array.prototype.slice.call(this);
        }
      }
    })
  },
  property: {
    index:    [],
    tbl:      {},
  },
  method: {
    init: function() {
    },
    put: function(idx, data) {
      var index = this.index;
      var last = this.tbl[idx];
      if (last === void(0)) {
        this.tbl[idx] = data;
        var s = 0, e = index.length;
        while (s != e) {
          var c = (s + e) >> 1;
          if (index[c] < idx) s = c + 1;
          else e = c;
        }
        index.splice(s, 0, idx);
      } else if (last !== data) {
        if (last instanceof SortedList.Tuple) last.push(data);
        else {
          var a = SortedList.Tuple();
          a.push(last); a.push(data);
          this.tbl[idx] = a;
        }
      }
    },
    get: function(idx) {
      var rt = this.tbl[idx];
      if (rt instanceof SortedList.Tuple) {
        rt = rt.arrayize();
      }
      return rt;
    },
    replace: function(old_idx, data, new_idx, add_if_not) {
      var removed = this.remove(old_idx, data, true);
      if (removed || add_if_not) this.put(new_idx, data);
    },
    remove: function(idx, data, ignore_error) {
      var d = this.tbl[idx];
      if (d instanceof SortedList.Tuple) {
        var i = d.indexOf(data);
        if (i < 0) {
          if (ignore_error) return false;
          throw new Error('Cannot determine which object to remove.');
        }
        d.splice(i, 1);
        var len = d.length;
        if (len == 1) {
          this.tbl[idx] = d[0];
        }
      } else if (d !== void(0)) {
        delete this.tbl[idx];
        var i = this.index.indexOf(idx);
        this.index.splice(i, 1);
      } else {
        if (ignore_error) return false;
        throw new Error('Object not found.');
      }
      return true;
    },
    range_get: function(min, max, filtered_src) {
      if (min > max) return [];
      var index = this.index;
      var len = index.length;
      var s = 0, e = len, x = 0;
      while (s != e) {
        var c = (s + e) >> 1;
        if (index[c] < min) s = c + 1;
        else e = c;
      }
      var min_idx = s;
      s = min_idx; e = len;
      while (s != e) {
        var c = (s + e) >> 1;
        if (index[c] < max) s = c + 1;
        else e = c;
      }
      var max_idx = (len <= s || max < index[s]) ? s - 1 : s;
      var rt = [];
      if (filtered_src) {
        for (; min_idx <= max_idx; min_idx++) {
          var r = this.tbl[index[min_idx]];
          if (r instanceof SortedList.Tuple) {
            for (var i=0,l=r.length; i<l; i++) {
              if (0 <= filtered_src.indexOf(r[i])) rt.push(r[i]);
            }
          } else {
            if (0 <= filtered_src.indexOf(r)) rt.push(r);
          }
        }
      } else {
        for (; min_idx <= max_idx; min_idx++) {
          var r = this.tbl[index[min_idx]];
          if (r instanceof SortedList.Tuple) {
            rt = rt.concat(r.arrayize());
          } else {
            rt.push(r);
          }
        }
      }
      return rt;
    }
  }
});

var UniqueList = classify("UniqueList", {
  property: {
    src: [],
    length: 0
  },
  method: {
    push: function(itm) {
      if (this.src.indexOf(itm) < 0) {
        this.src.push(itm);
        this.length++;
      }
    },
    unshift: function(itm) {
      if (this.src.indexOf(itm) < 0) {
        this.src.unshift(itm);
        this.length++;
      }
    },
    pop: function(itm) {
      var rt;
      if (itm) {
        var idx = this.src.indexOf(itm);
        if (idx < 0) throw new Error('The item ' + itm + ' is not found on list.');
        rt = this.src.splice(idx, 1)[0];
      } else {
        rt = this.src.pop();
      }
      this.length--;
      return rt;
    },
    shift: function(itm) {
      if (itm) return this.pop(itm);
      this.length--;
      return this.src.shift();
    },
    map: function(fn) {
      for (var i=0, l=this.length; i < l; i++) {
        this.src[i] = fn(this.src[i], i);
      }
    },
    clear: function() {
      this.src = [];
      this.length = 0;
    },
  }
});
/** @} */
/** @file element_base.js { */
var ElementBase = classify('ElementBase', {
  property: {
    d:         null,
    stage:     null,
    parent:    null,
    style:     null,
    selecting: false,
    children:  [],
  },
  method: {
    init: function(parent, shape) {
      this.parent = parent;
      this.stage = parent.stage;
      this.d = this.make_instance(parent, shape);
      this.parent_changed();
      this.stage.draw(this);
    },
    make_instance: function(parent, shape) {
      return null;
    },
    get_style: function(mode) {
      return (this.style && this.style[mode]) || this.__class__.style[mode];
    },
    stylize: function(name) {
      this.d.style(this.get_style(name));
    },
    select: function(ignore_report) {
      if (!this.selecting) {
        this.selecting = true;
        this.stylize('highlight');
        if (!ignore_report) this.stage.select(this);
      }
    },
    unselect: function(ignore_report) {
      if (this.selecting) {
        this.stylize('base');
        this.selecting = false;
        if (!ignore_report) this.stage.unselect(this);
      }
    },
    toggle_select: function(ignore_report) {
      if (this.selecting) this.unselect(ignore_report);
      else                this.select(ignore_report);
    },
    position: function() {
      return this.d.position();
    },
    center: function() {
      var pos = this.d.position();
      var size = this.d.size();
      return {
        x: pos.x + (size.x / 2.0),
        y: pos.y + (size.y / 2.0)
      };
    },
    size: function() {
      return this.d.size();
    },
    zIndex: function() {
      return this.d.zIndex();
    },
    change: function(data) {
      for (var i in data) {
        this.d[i](data[i]);
      }
    },
    add_child: function(c) {
      this.children.push(c);
      return c;
    },
    remove_child: function(c) {
      this.children.splice(this.children.indexOf(c), 1);
    },
    parent_changed: function()  {},
    drag_start:     function(e) {},
    drag:           function(e) {},
    drag_end:       function(e) {},
    click:          function(e) {},
    mousedown:      function(e) {},
    mouseup:        function(e) {},
    mousemove:      function(e) {},
    mouseover:      function(e) {},
    mouseout:       function(e) {},
    drawed: function(stage) {
      var self = this;
      var downing = false;
      var downing_evt = null;
      var draged = false;
      this.stage = stage;
      this.d.addEvent({
        mousedown: function(e) {
         if (!downing) {
            this.captureMouse();
            downing = true;
            downing_evt = e;
            draged = false;
          }
          self.mousedown(e);
        },
        mouseup:   function(e) {
          if (downing) {
            this.releaseMouse();
            downing = false;
            downing_evt = null;
            if (draged) self.drag_end(e);
            else        self.click(e);
            draged = false;
          }
          self.mouseup(e);
        },
        mousemove: function(e) {
          if (downing) {
            draged = true;
            if (downing_evt) {
              self.drag_start(downing_evt);
              downing_evt = null;
            }
            self.drag(e);
          } else {
            self.mousemove(e);
          }
        },
        mouseover: function(e) {
          if (!downing) self.mouseover(e);
        },
        mouseout: function(e) {
          if (!downing) self.mouseout(e);
        }
      });
    },
    unbind: function(ch) {
      var idx = this.children.indexOf(ch);
      if (idx < 0) return;
      this.children.splice(idx, 1);
    },
    erase: function() {
      this.stage.erase(this);
      while ( this.children.length ) this.children[0].erase();
      this.parent.unbind(this);
      this.parent = null;
    },
    erased: function(stage) {
      this.stage = null;
    }
  },
  after: {
    change: function() {
      for (var i=0, l=this.children.length; i<l; i++)
        this.children[i].parent_changed();
    }
  }
});/** @} */
/** @file pipe.js { */
var Pipe = classify('Pipe', {
  parent: ElementBase,
  static: {
    style: {
      base: {
        fill: null,
        stroke: {
          width: 3, color: new Fashion.Color('#F60')
        }
      },
      hover: {
        fill: null,
        stroke: {
          width: 5, color: new Fashion.Color('#FF0')
        }
      },
      highlight: {
        fill: null,
        stroke: {
          width: 5, color: new Fashion.Color('#000')
        }
      }
    }
  },
  property: {
    parents: [],
    options: null
  },
  method: {
    init: function(parent, options) {
      this.parents[0] = parent;
      this.parents[1] = null;
      this.options = options;
      this.style = this.options.style;
      this.__super__().init.apply(this, arguments);
    },
    make_instance: function(parent, options) {
      var d = new Fashion.Path({
        points: new Fashion.PathData([]),
        style:  this.get_style('base')
      });
      return d;
    },
    reset_parent: function(parent_start, parent_end) {
      this.parents[0] = parent_start;
      this.parents[1] = parent_end;
      this.parent_changed();
    },
    parent_changed: function() {
      var start = this.parents[0].center();
      var end   = (this.parents[1] && this.parents[1].center()) || {x: start.x, y: start.y};
      var z     = Math.max(this.parents[0].zIndex(),
                           (this.parents[1] && this.parents[1].zIndex()) || -Infinity);
      this.change({
        points: new Fashion.PathData([
          ['M', start.x, start.y],
          ['C',
           start.x + ((end.x-start.x)/1.5), start.y,
           start.x + ((end.x-start.x) - ((end.x-start.x)/1.5)), end.y,
           end.x, end.y ]
        ]),
        zIndex: z
      });
    },
    click: function(e) {
      this.toggle_select();
    },
    mouseover: function(e) {
      if (!this.selecting) this.stylize('hover');
    },
    mouseout: function(e) {
      if (!this.selecting) this.stylize('base');
    },
    mouseup: function(e) {
      if (!this.selecting) this.stylize('base');
    },
    drag_start: function(e) {},
    drag:       function(e) {},
    drag_end:   function(e) {},
    drag_by_parent: function(e) {
      var start = this.parents[0].center();
      var end   = e.logicalPosition;
      this.change({
        points: new Fashion.PathData([
          ['M', start.x, start.y],
          ['C',
           start.x + ((end.x-start.x)/1.5), start.y,
           start.x + ((end.x-start.x) - ((end.x-start.x)/1.5)), end.y,
           end.x, end.y ]
        ])
      });
    }
  },
  after: {
    erase: function() {
      if (this.parents[0]) this.parents[0].unbind(this);
      if (this.parents[1]) this.parents[1].unbind(this);
    }
  }
});/** @} */
/** @file point.js { */
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
        target.children.push(this.current_pipe);
        this.current_pipe.reset_parent(this, h[0]);
      } else {
        this.children.pop();
        this.current_pipe.erase();
      }
    }
  }
});/** @} */
/** @file node.js { */
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
});/** @} */
/** @file stage.js { */
var Stage = classify('Stage', {
  property: {
    elem: null,
    d:    null,
    shift_key: false,
    size: {},
    selected_nodes: null,
    nodes: []
  },
  method: {
    init: function(selector) {
      var self = this;
      this.elem = $(selector);
      this.elem.attr({tabindex: 0});
      this.elem.css({outline: 'none'});
      this.elem.keydown(function(e) {
        self.keydown(e);
        return false;
      });
      this.elem.keyup(function(e) {
        self.keyup(e);
        return false;
      });
      this.d = new Fashion.Drawable(this.elem[0]);
      this.size = {
        x: this.elem.width(),
        y: this.elem.height()
      };
      this.draw_background();
      this.d.addEvent({
        mouseup: function(e) {
          if (!self.shift_key) self.unselect_all();
        }
      });
      this.selected_nodes = new UniqueList();
    },
    draw: function(node) {
      this.d.draw(node.d);
      this.nodes.push(node);
      node.drawed(this);
    },
    erase: function(node) {
      this.d.erase(node.d);
      var idx = this.nodes.indexOf(node);
      if (-1 < idx) this.nodes.splice(idx, 1);
      node.erased(this);
    },
    select_all: function() {
      for (var i = 0, l = this.nodes.lenght; i<l; i++) {
        this.nodes[i].select();
      }
    },
    select: function(node) {
      if (!this.shift_key) this.unselect_all();
      this.selected_nodes.push(node);
      node.change({ zIndex: this.d.getMaxDepth() + 1 });
    },
    unselect: function(node) {
      this.selected_nodes.pop(node);
    },
    unselect_all: function() {
      var ns = this.selected_nodes;
      ns.map(function(node, idx) {
        node.unselect(true);
      });
      ns.clear();
    },
    viewport: function() {
      return this.d.viewportSize();
    },
    keydown: function(e) {
      var c = e.keyCode;
      switch (c) {
      case 8: // backspace
        var ns = this.selected_nodes;
        ns.map(function(node, idx) {
          node.unselect(true);
          node.erase();
        });
        ns.clear();
        break;
      case 16: // shift
        this.shift_key = true;
        break;
      }
    },
    keyup: function(e) {
      var c = e.keyCode;
      switch (c) {
      case 16:
        this.shift_key = false;
        break;
      }
    },
    draw_background: function() {
      var span = 20;
      var s = this.size;
      var c = new Fashion.Color("#000");
      var w = 0.5;
      var pat = [1, 4];
      for (var l = span; l < s.x; l+=span) {
        this.d.draw(
          new Fashion.Path({
            points: new Fashion.PathData([['M', l, -0.5], ['L', l, s.y]]), //'M '+l+' -0.5 L '+l+' '+s.h
            style: {
              fill: null,
              stroke: { width: w, color: c, pattern: pat }
            },
          })
        );
      }
      for (var h = span; h < s.y; h+=span) {
        this.d.draw(
          new Fashion.Path({
            points: new Fashion.PathData([['M', -0.5, h], ['L', s.x, h]]),
            style: {
              fill: null,
              stroke: { width: w, color: c, pattern: pat }
            },
          })
        );
      }
    }
  }
});/** @} */

  NetUI.Pipe  = Pipe;
  NetUI.Point = Point;
  NetUI.Node  = Node;
  NetUI.Stage = Stage;

  function convert_fashion(def) {
    if (!(typeof def == 'object' && def.constructor == Object)) return def;
    var rt = {};
    for (var i in def) {
      if (i === 'color') {
        rt[i] = new Fashion.Color(def[i]);
      } else if (i === 'fill') {
        rt[i] = new Fashion.FloodFill(new Fashion.Color(def[i]));
      } else {
        rt[i] = convert_fashion(def[i]);
      }
    }
    return rt;
  }

  var pipe_types = {};
  NetUI.definePipeType = function(definitions) {
    function wrap(d) {
      return d ? { fill: null, stroke: d } : null;
    }
    for (var name in definitions) {
      var definition  = definitions[name];
      var style       = convert_fashion(definition.style);
      style.base      = wrap(style.base);
      style.hover     = wrap(style.hover) || style.base;
      style.highlight = wrap(style.highlight) || style.base;
      pipe_types[name] = { style: style };
    }
  };

  var point_types = {};
  NetUI.definePointType = function(definitions) {
    for (var name in definitions) {
      var definition  = definitions[name];
      point_types[name] = definition;
    }
  };

  var node_types = {};
  NetUI.defineNodeType = function(definitions) {
    function wrap(d) {
      return d ? { fill:   d.fill ? d.fill : null,
                   stroke: d.stroke ? d.stroke : null } : null;
    }
    for (var name in definitions) (function(name) {
      var definition  = definitions[name];
      var def = {};
      var style = convert_fashion(definition.style);
      style.base = wrap(style.base);
      style.hover     = wrap(style.hover) || style.base;
      style.highlight = wrap(style.highlight) || style.base;
      def.style = style;
      if (definition.body) {
        def.body = definition.body;
      } else if (definition.body_url) {
        $.ajax({
          url: definition.body_url,
          type: 'get',
        }).done(function(txt) {
          def.body = txt;
        });
      } else {
        def.body = '';
      }
      def.points = definition.points;
      node_types[name] = def;
    })(name);
  };

  NetUI.createPoint = function(node, type, definition) {
    var _default = point_types[type];
    var origin = (definition && definition.position && definition.position.origin) || 'left-top';
    var offset = (definition && definition.position && definition.position.offset) || {x: 10, y: 10};
    var radius = 4;
    var pipe_style = pipe_types[_default.pipe].style;
    var connect_filter = function(pt) {
      return -1 < _default.connectable.indexOf(pt.options.type);
    };
    node.add_point({
      origin: origin,
      offset: offset,
      radius: radius,
      pipe_style: pipe_style,
      connect_filter: connect_filter,
      type: type
    });
  };

  NetUI.createNode = function(stage, type, definition) {
    var vp = stage.viewport();
    var settings = node_types[type];
    var node = new NetUI.Node({
      stage: stage,
      unbind: function(itm) {}
    }, {
      position: (definition && definition.position) || { x: (vp.x / 2) - 50, y: (vp.y / 2) - 50},
      size:     (definition && definition.size) || 'auto',
      zIndex:   stage.d.getMaxDepth() + 1,
      body:     settings.body,
      padding:  20,
      style:    settings.style
    });
    for (var i = 0, l = settings.points.length; i<l; i++) {
      var p = settings.points[i];
      NetUI.createPoint(node, p.type, p);
    }
  };

  window.NetUI = NetUI;

})(this);/** @} */
