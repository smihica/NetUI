/** @file netui.js { */
(function(window) {

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

function _map(fn, arr) {
  if (typeof arr.map == 'function') return arr.map(fn);
  else {
    for (var i=0, l=arr.length, rt=[]; i<l; i++) {
      var itm = fn(arr[i], i);
      rt.push(itm);
    }
    return rt;
  }
}

function _clip(val, max, min) {
  return (val < min) ? min : (max < val) ? max : val;
}

function _fashion_color(c) {
  return  ((c instanceof Fashion.Color) ? c :
           (typeof c == 'string') ? new Fashion.Color(c) :
           null);
}

function _fashion_fill(c) {
  return ((c instanceof Fashion.FloodFill) ? c :
          (c = _fashion_color(c)) ? new Fashion.FloodFill(c) :
          null);
}

function _convert_fashion(def) {
  if (!(typeof def == 'object' && def.constructor == Object)) return def;
  var rt = {};
  for (var i in def) {
    if (i === 'color') {
      rt[i] = _fashion_color(def[i]);
    } else if (i === 'fill') {
      rt[i] = _fashion_fill(def[i]);
    } else {
      rt[i] = _convert_fashion(def[i]);
    }
  }
  return rt;
}

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
    options:   null,
    selecting: false,
    children:  [],
  },
  method: {
    init: function(parent, options) {
      this.parent = parent;
      this.stage = parent.stage;
      this.options = options || {};
      this.style = ((options && options.style) || {});
      this.d = this.make_instance(parent, options);
      this.parent_changed();
      this.stage.draw(this);
    },
    make_instance: function(parent, options) {
      return null;
    },
    get_style: function(mode) {
      return (this.style && this.style[mode]) || this.__class__.style[mode];
    },
    stylize: function(name) {
      this.d.style(this.get_style(name));
    },
    select: function(ignore_report, fource) {
      if (!this.selecting) {
        this.selecting = true;
        this.stylize('highlight');
        if (!ignore_report) this.stage.select(this, fource);
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
/** @file text.js { */
var Text = classify('Text', {
  parent: ElementBase,
  property: {},
  static: {
    style: {
      color: _fashion_color('#000'),
      fontFamily: 'Arial',
      fontSize: 12,
      offset: { x: 0, y: 0 },
      opacity: { normal: 255, soft: 160 }
    }
  },
  method: {
    init: function() {
      this.__super__().init.apply(this, arguments);
    },
    make_instance: function(parent, options) {
      var p;
      if (options.origin && options.origin === 'center') p = parent.center();
      else p = parent.position();
      var z = parent.zIndex() + 1;
      var t = new Fashion.Text({
        anchor: options.anchor || 'left',
        position: {
          x: p.x + options.offset.x,
          y: p.y + options.offset.y
        },
        text: options.text,
        zIndex: z,
        fontFamily: options.fontFamily || Text.style.fontFamily,
        fontSize: options.fontSize || Text.style.fontSize
      });
      t.style({fill: _fashion_fill(options.color || Text.style.color)});
      return t;
    },
    parent_changed: function() {
      var pos;
      if (this.options.origin && this.options.origin === 'center')
        pos = this.parent.center();
      else pos = this.parent.position();
      var z   = this.parent.zIndex() + 1;
      this.d.position({
        x: pos.x + this.options.offset.x,
        y: pos.y + this.options.offset.y
      });
      this.d.zIndex(z);
    },
    soften: function(sw) {
      var fill = this.d.style().fill;
      fill.color.a = sw ? Text.style.opacity.soft : Text.style.opacity.normal;
      this.d.style({fill: fill});
    },
    _through_event: function(target, ev_name, e) {
      if (target && this[target]) {
        e.offsetPosition.x += this.options.offset.x;
        e.offsetPosition.y += this.options.offset.y;
        this[target][ev_name](e);
      }
    },
    click: function(e) {
      this._through_event(this.options.through_event, 'click', e);
    },
    drag_start: function(e) {
      this._through_event(this.options.through_event, 'drag_start', e);
    },
    drag: function(e) {
      this._through_event(this.options.through_event, 'drag', e);
    },
    drag_end: function(e) {
      this._through_event(this.options.through_event, 'drag_end', e);
    }
  }
});
/** @} */
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
  },
  method: {
    init: function(parent, options) {
      this.parents[0] = parent;
      this.parents[1] = null;
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
        stroke: {width: 1, color: _fashion_color('#000')},
        fill:   _fashion_fill('#FFF'),
        cursor: 'pointer'
      },
      highlight: {
        stroke: {width: 3, color: _fashion_color('#FF0')},
        fill:   _fashion_fill('#F00'),
        cursor: 'pointer'
      },
      color: _fashion_color('#000')
    },
    last_hovering_points: [],
    fontSize: 13,
    fontFamily: 'Arial'
  },
  accessor: {
    offset: { x: 0, y: 0 }
  },
  property: {
    d:      null,
    stage:  null,
    options:  null,
    offset_position_drag_start: {x: 0, y: 0},
    last_pos: { x: 0, y: 0 },
    current_pipe: null,
    text: null,
    name: ''
  },
  method: {
    init: function(parent, options, name) {
      this.name = name;
      this.offset({ x: options.position.offset.x, y: options.position.offset.y });
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
        y: p.y + (o[1] === 'top'  ? Node.header.height : s.y)
      };
    },
    parent_changed: function() {
      var s = this.parent.size();
      var origin = this.origin_pos(this.options.position.origin);
      var offset = this.offset();
      var pos = {
        x: (origin.x + (Math.abs(offset.x) < 1 ? offset.x * s.x : offset.x)) - this.options.radius,
        y: (origin.y + (Math.abs(offset.y) < 1 ? offset.y * ( s.y - Node.header.height) : offset.y)) - this.options.radius
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
        var c = this.children[i];
        if (c instanceof Pipe) {
          for (var j=0; j<2; j++) {
            var p = c.parents[j];
            if (p && p !== this) rt.push(p);
          }
        }
      }
      return rt;
    },
    dump: function(backref_p) {
      var connections = [];
      var pts = this.connecting_points();
      var my_idx = this.stage.get_elem_index(this.parent, NetUI.Node);
      for (var i=0, l=pts.length; i<l; i++) {
        var p = pts[i];
        var node_idx = this.stage.get_elem_index(p.parent, NetUI.Node);
        if (backref_p || node_idx < my_idx)
          connections.push([node_idx, p.name]);
      }
      var set_color = (typeof this.options.color == 'string') ? this.options.color : void(0);
      return {
        label:    (!!this.options.label),
        type:     this.options.type,
        position: {
          origin: this.options.position.origin,
          offset: this.offset()
        },
        connections: connections,
        color:    set_color
      };
    },
    on_parent_select: function() {
      if (this.text) this.text.soften(false);
    },
    on_parent_unselect: function() {
      if (this.text) this.text.soften(true);
    },
    _get_labels_anchor_position: function() {
      var pp = this.parent.position();
      var ps = this.parent.size();
      var p  = this.center();
      var offset = {
        x: ((p.x - pp.x) / ps.x),
        y: ((p.y - (pp.y + Node.header.height)) / (ps.y - Node.header.height))
      };
      var a, o, th_x = 0.2, th_y = 0.3;
      if (offset.x < th_x) { // x has higher priority than y.
        a = 'left';   o = { x: 8,  y: 3.5 };
      } else if ((1.0-th_x) < offset.x) {
        a = 'right';  o = { x: -7, y: 3.5 };
      } else if (offset.y < th_y) {
        a = 'center'; o = { x: 0,  y: 18 };
      } else if ((1.0-th_y) < offset.y) {
        a = 'center'; o = { x: 0,  y: -10 };
      } else {
        a = 'left';   o = { x: 8,  y: 3.5 };
      }
      return { anchor: a, offset: o };
    }
  },
  before: {
    drawed: function() {
      if (this.options.label) {
        var ap = this._get_labels_anchor_position();
        var t = new Text(this, {
          origin:     'center',
          anchor:     ap.anchor,
          offset: {
            x: ap.offset.x,
            y: ap.offset.y
          },
          text:       this.name,
          fontFamily: Point.fontFamily,
          fontSize:   Point.fontSize,
          color:      this.options.color
        });
        this.text = t;
        this.children.push(t);
      }
    }
  },
  after: {
    init: function(parent, options, name) {
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
});/** @} */
/** @file button.js { */
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
});/** @} */
/** @file node.js { */
var Node = classify('Node', {
  parent: ElementBase,
  static: {
    style: {
      base: {
        stroke: null,
        fill:   _fashion_fill('#CCC'),
      },
      highlight: {
        stroke: { width: 5, color: _fashion_color('#FC0') },
        fill:   _fashion_fill('#EEE')
      },
      color: _fashion_color('#000')
    },
    header: {
      height:     25,
      fontFamily: 'Arial',
      fontSize:   16,
      offset:     { x: 18, y: 18 }
    },
    padding: 15
  },
  accessor: {
    datas: {}
  },
  property: {
    offset_position_drag_start: { x: 0, y: 0 },
    body: null,
    body_size: { x: 0, y: 0 },
    points: {},
    points_length: 0,
  },
  method: {
    init: function() {
      this.__super__().init.apply(this, arguments);
    },
    add_point: function(name, options) {
      var p = new Point(this, options, name);
      this.points[name] = p;
      this.points_length++;
      return this.add_child(p);
    },
    remove_point: function(p) {
      var name = p.name;
      if (name) {
        delete this.points[name];
        this.points_length--;
      }
      this.remove_child(p);
    },
    get_point_by_name: function(name) {
      return this.points[name];
    },
    make_instance: function(parent, options) {
      var shape = {
        position: options.position,
        size:     options.size === 'auto' ? { x: 0, y: 0 } : options.size,
      };
      shape.style  = this.get_style('base');
      shape.corner = { x: 10, y: 10 };
      var type = options.type;
      var d = new Fashion.Rect(shape);
      if (options.zIndex) d.zIndex(options.zIndex);
      if (options.body) this.make_body(parent, d, options);
      return d;
    },
    make_body: function(parent, d, options) {
      var self = this;
      var pos = options.position;
      var window_pos = this.stage.html.position();
      var body = $('<div/>', {id: "body_" + d.id});
      body.html(options.body);
      body.css({
        position: 'absolute',
        left:     window_pos.left + pos.x + Node.padding,
        top:      window_pos.top  + pos.y + Node.header.height + Node.padding,
      });
      $(document.body).append(body);
      var w = body.width();
      var h = body.height();
      d.size({
        x: w + (Node.padding * 2),
        y: h + Node.header.height + (Node.padding * 2)
      });
      this.body = body;
      this.body.hide();
      this.body_size = { x: w, y: h };
      this.body.mouseup(function(e){ self.body_mouseup(e); });
      if (options.datas) {
        this.datas(options.datas);
        this.load_datas();
      }
    },
    body_append: function(selector, jq_elem) {
      if (!selector && !jq_elem) return;
      if (!jq_elem) this.body.append(selector);
      else $(selector, this.body).append(jq_elem);
      this.body_changed();
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
          x: nx + (Node.padding * 2),
          y: ny + Node.header.height + (Node.padding * 2)
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
    },
    draw_buttons: function() {
      var i = 1;
      for (var name in this.options.buttons) {
        var onclick = this.options.buttons[name];
        var b = new Button(this, {
          name:   name,
          origin: 'right-top',
          offset: { x: (-20 * i), y: 5 },
          onclick: onclick
        });
        this.children.push(b);
        i++;
      }
    },
    load_datas: function(datas) {
      if (!datas) datas = this.datas();
      for (var k in datas) {
        var v = datas[k];
        var elem = $('#' + k, this.body);
        if (elem.attr('type') === 'checkbox') {
          elem.attr('checked', !!v);
        } else {
          elem.val(v);
        }
      }
    },
    dump_datas: function() {
      var datas = {}, d = this.datas();
      if (d) {
        for (var k in d) {
          var elem = $('#' + k, this.body);
          if (elem.attr('type') === 'checkbox')
            datas[k] = !!elem.is(':checked');
          else datas[k] = elem.val();
        }
      }
      return datas;
    },
    dump_points: function(backref_p) {
      var points = {};
      for (var n in this.points) {
        var p = this.points[n];
        points[n] = p.dump(backref_p);
      }
      return points;
    },
    dump_data_network: function() {
      var points = this.dump_points(true);
      var datas  = this.dump_datas();
      return {
        points: points,
        datas:  datas
      };
    },
    dump: function() {
      var points = this.dump_points(false);
      var datas  = this.dump_datas();
      var body = this.body.html();
      return {
        selecting:  this.selecting,
        type:       this.options.type,
        position:   this.position(),
        size:       this.options.size,
        zIndex:     this.zIndex(),
        points:     points,
        datas:      datas,
        body:       (body !== NetUI.types.node[this.options.type].body) ? body : void(0)
      };
    }
  },
  before: {
    drawed: function() {
      var t = new Text(this, {
        text: this.options.type,
        color: this.options.color || Node.style.color,
        offset: {
          x: Node.header.offset.x,
          y: Node.header.offset.y
        },
        fontFamily: Node.header.fontFamily,
        fontSize:   Node.header.fontSize,
        through_event: 'parent'
      });
      this.children.push(t);
      if (this.options.buttons) this.draw_buttons();
    },
    erase: function() {
      this.body.remove();
    }
  },
  after: {
    change: function(d) {
      if (d.position) {
        var pos = d.position;
        var window_pos = this.stage.html.position();
        this.body.css({
          left:     window_pos.left + pos.x + Node.padding,
          top:      window_pos.top  + pos.y + Node.header.height + Node.padding
        });
      }
    },
    select: function() {
      this.body.hide();
      for (var n in this.points) {
        this.points[n].on_parent_select();
      }
    },
    unselect: function() {
      this.body.show();
      for (var n in this.points) {
        this.points[n].on_parent_unselect();
      }
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
    selected_elems: null,
    elems: []
  },
  method: {
    init: function(selector) {
      var self = this;
      this.html = $(selector);
      this.html.attr({tabindex: 0});
      this.html.css({outline: 'none'});
      this.html.keydown(function(e) {
        self.keydown(e);
        return false;
      });
      this.html.keyup(function(e) {
        self.keyup(e);
        return false;
      });
      this.d = new Fashion.Drawable(this.html[0]);
      this.size = {
        x: this.html.width(),
        y: this.html.height()
      };
      this.draw_background();
      this.d.addEvent({
        mouseup: function(e) {
          if (!self.shift_key) self.unselect_all();
        }
      });
      this.selected_elems = new UniqueList();
    },
    draw: function(elem) {
      this.d.draw(elem.d);
      this.elems.push(elem);
      elem.drawed(this);
    },
    erase: function(elem) {
      this.d.erase(elem.d);
      var idx = this.elems.indexOf(elem);
      if (-1 < idx) this.elems.splice(idx, 1);
      elem.erased(this);
    },
    clear: function() {
      this.unselect_all();
      while (this.elems.length) {
        this.elems[0].erase();
      }
    },
    get_elem_index: function(elem, filter_class) {
      var idx = 0;
      if (filter_class) {
        for (var i=0, l=this.elems.length; i<l; i++) {
          var n = this.elems[i];
          if (n === elem) break;
          if (n instanceof filter_class) idx++;
        }
        if (i == l) idx = -1;
      } else {
        idx = this.elems.indexOf(elem);
      }
      return idx;
    },
    get_elem_by_index: function(idx, filter_class) {
      var iter = 0;
      if (filter_class) {
        for (var i=0, l=this.elems.length; i<l; i++) {
          var n = this.elems[i];
          if (n instanceof filter_class) {
            if (iter === idx) return n;
            iter++;
          }
        }
      } else {
        return this.elems[idx];
      }
      return null;
    },
    select_all: function() {
      for (var i = 0, l = this.elems.length; i<l; i++) {
        this.elems[i].select(true);
        this.selected_elems.push(this.elems[i]);
      }
    },
    select: function(elem, fource) {
      if (!this.shift_key && !fource) this.unselect_all();
      this.selected_elems.push(elem);
      elem.change({ zIndex: this.d.getMaxDepth() + 1 });
    },
    unselect: function(elem) {
      this.selected_elems.pop(elem);
    },
    unselect_all: function() {
      var ns = this.selected_elems;
      ns.map(function(elem, idx) {
        elem.unselect(true);
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
        var ns = this.selected_elems;
        ns.map(function(elem, idx) {
          elem.unselect(true);
          elem.erase();
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

  var NetUI = classify('NetUI', {
    static: {
      Pipe:  Pipe,
      Point: Point,
      Node:  Node,
      Stage: Stage,
      Button: Button,

      types: {
        pipe:  {},
        point: {},
        node:  {}
      },
      type_definitions: {
        pipe:  {},
        point: {},
        node:  {}
      },

      all_defined: true,
      defineNodeTypeAccm: 0,
      after_defineds: [],

      definePipeType: function (definitions) {
        function wrap(d) {
          return d ? { fill: null, stroke: d } : null;
        }
        for (var name in definitions) {
          var definition  = definitions[name];
          this.type_definitions.pipe[name] = definition;
          var style       = _convert_fashion(definition.style);
          style.base      = wrap(style.base);
          style.hover     = wrap(style.hover) || style.base;
          style.highlight = wrap(style.highlight) || style.base;
          this.types.pipe[name] = { style: style };
        }
      },
      definePointType: function (definitions) {
        for (var name in definitions) {
          var d = definitions[name];
          this.type_definitions.point[name] = d;
          this.types.point[name] = _convert_fashion(d);
        }
      },
      defineNodeType: function (definitions, onDefinitionFinished) {
        var self = this;
        self.all_defined = false;
        self.defineNodeTypeAccm += 1;
        function finished() {
          if (onDefinitionFinished) onDefinitionFinished();
          self.defineNodeTypeAccm -= 1;
          if (self.defineNodeTypeAccm == 0) {
            self.fireAllDefined();
          }
        };
        function notify(name) {
          names.splice(names.indexOf(name), 1);
          if (names.length == 0) finished();
        };
        function wrap(d) {
          return d ? { fill:   d.fill ? d.fill : null,
                       stroke: d.stroke ? d.stroke : null } : null;
        }
        var names = [];
        for (var name in definitions) (function(name) {
          names.push(name);
          var d  = definitions[name];
          if (d.buttons) {
            for (var k in d.buttons) {
              var fn = d.buttons[k];
              d.buttons[k] = fn.toString();
            }
          }
          self.type_definitions.node[name] = d;
          var def = {};
          var style = _convert_fashion(d.style);
          style.base = wrap(style.base);
          style.hover = wrap(style.hover) || style.base;
          style.highlight = wrap(style.highlight) || style.base;
          def.style = style;
          if (d.body) {
            def.body = d.body;
          } else if (d.body_url) {
            $.ajax({
              url: d.body_url,
              type: 'get',
            }).done(function(txt) {
              def.body = txt;
              notify(name);
            });
          } else def.body = '';
          def.points = d.points;
          def.data_binds = d.data_binds;
          def.buttons = d.buttons;
          self.types.node[name] = def;
        })(name);
      },
      defineButton: function(name, icon) {
        Button.new_button(name, icon);
      },
      fireAllDefined: function() {
        this.all_defined = true;
        var fn;
        while(fn = this.after_defineds.shift()) fn();
      },
      setOnDefinedAll: function(fn) {
        if (this.all_defined) fn();
        else this.after_defineds.push(fn);
      },
      createPoint: function (node, name, type, definition) {
        var d = definition;
        var _default = this.types.point[type];
        var origin = (d && d.position && d.position.origin) || 'left-top';
        var offset = (d && d.position && d.position.offset) || {x: 10, y: 10};
        var radius = 4;
        var pipe_style = this.types.pipe[_default.pipe].style;
        var connect_filter = function(pt) {
          return -1 < _default.connectable.indexOf(pt.options.type);
        };
        var label = (d && d.hasOwnProperty('label')) ? d.label : _default.label;
        node.add_point(name, {
          position: {
            origin: origin,
            offset: offset,
          },
          radius: radius,
          pipe_style: pipe_style,
          connect_filter: connect_filter,
          connections: d.connections || [],
          type: type,
          label: label,
          color: (d && d.color) || _default.color
        });
      },
      createNode: function (stage, type, definition) {
        var d = definition;
        var vp = stage.viewport();
        var settings = this.types.node[type];

        var datas = {};
        for (var k in settings.data_binds) {
          datas[k] = settings.data_binds[k];
        }
        if (d && d.datas) {
          for (var k in d.datas) {
            datas[k] = d.datas[k];
          }
        }

        var buttons = {};
        for (var k in settings.buttons) {
          var fn_str = settings.buttons[k];
          buttons[k] = eval("("+fn_str+")");
        }

        var node = new this.Node({
          stage: stage,
          unbind: function(itm) {}
        }, {
          position: (d && d.position) || { x: (vp.x / 2) - 50, y: (vp.y / 2) - 50},
          size:     (d && d.size)     || 'auto',
          zIndex:   (d && d.zIndex)   || stage.d.getMaxDepth() + 1,
          body:     (d && d.body && $(d.body)) || settings.body,
          datas:    datas,
          padding:  25,
          style:    settings.style,
          type:     type,
          color:    ((d && d.color) ||
                     (d && d.style && d.style.color) ||
                     (settings.style && settings.style.color) ||
                     settings.color),
          buttons:  buttons
        });
        if (d && d.points) {
          for (var name in d.points) {
            var p = d.points[name];
            this.createPoint(node, name, p.type, p);
          }
        } else {
          for (var name in settings.points) {
            var p = settings.points[name];
            this.createPoint(node, name, p.type, p);
          }
        }
        if (d && d.selecting) node.select(false, true);
        else node.unselect(false, true);
      },
      dump_data_network: function(stage, pretty) {
        for (var i=0, l=stage.elems.length, net = []; i<l; i++) {
          var n = stage.elems[i];
          if (n instanceof Node) net.push(n.dump_data_network());
        }
        return ((pretty) ?
                JSON.stringify(net, null, pretty) :
                JSON.stringify(net));
      },
      dump: function(stage, pretty) {
        for (var i=0, l=stage.elems.length, nodes = []; i<l; i++) {
          var n = stage.elems[i];
          if (n instanceof Node) nodes.push(n.dump());
        }
        var rt = {
          nodes: nodes,
          types: this.type_definitions,
        };
        if (pretty) {
          return JSON.stringify(rt, null, pretty);
        }
        return JSON.stringify(rt);
      },
      load: function(stage, data, with_clear, preserve_type) {
        if (with_clear) {
          stage.clear();
          if (!preserve_type) {
            this.type_definitions = {
              pipe:  {},
              point: {},
              node:  {}
            };
          }
        }
        var data = JSON.parse(data);
        function define_types() {
          if (stage) {
            var types = data['types'];
            for (var t in types) {
              var type = types[t];
              switch (t) {
              case 'pipe':
                NetUI.definePipeType(type);
                break;
              case 'point':
                NetUI.definePointType(type);
                break;
              case 'node':
                NetUI.defineNodeType(type, create_nodes);
                break;
              }
            }
          }
        }
        function create_nodes() {
          var nodes = data['nodes'];
          for (var i=0,l=nodes.length; i<l; i++) {
            var node = nodes[i];
            NetUI.createNode(stage, node.type, {
              position:  node.position,
              size:      node.size,
              zIndex:    node.zIndex,
              selecting: node.selecting,
              points:    node.points,
              datas:     node.datas,
              body:      node.body
            });
          }
        }
        if (preserve_type) create_nodes();
        else define_types();
      }
    }
  });

  window.NetUI = NetUI;

})(this);/** @} */
