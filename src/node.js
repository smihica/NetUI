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
  property: {
    offset_position_drag_start: { x: 0, y: 0 },
    body: null,
    body_size: { x: 0, y: 0 },
    points: {},
    texts: []
  },
  method: {
    init: function(parent, options) {
      this.options = options;
      this.style = this.options.style;
      this.__super__().init.apply(this, arguments);
    },
    add_point: function(name, options) {
      var p = new Point(this, options, name);
      this.points[name] = p;
      return this.add_child(p);
    },
    remove_point: function(p) {
      var name = p.name;
      if (name) delete this.points[name];
      this.remove_child(p);
    },
    get_point_by_name: function(name) {
      return this.points[name];
    },
    make_instance: function(parent, options) {
      var shape = {
        position: options.position,
        size:     options.size === 'auto' ? {x: 0, y: 0} : options.size,
      };
      shape.style  = this.get_style('base');
      shape.corner = {x: 10, y: 10};
      var type = options.type;
      var d = new Fashion.Rect(shape);
      if (options.zIndex) d.zIndex(options.zIndex);
      if (options.body) {
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
        if (options.datas) this.load_datas(options.datas);
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
    load_datas: function(datas) {
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
      var datas = {};
      if (this.options.datas) {
        for (var k in this.options.datas) {
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
      return {
        selecting:  this.selecting,
        type:       this.options.type,
        position:   this.position(),
        size:       this.options.size,
        zIndex:     this.zIndex(),
        points:     points,
        datas:      datas
      };
    }
  },
  before: {
    drawed: function() {
      var p = this.position();
      var z = this.zIndex() + 1;
      var t = new Fashion.Text({
        anchor: 'left',
        position: {
          x: p.x + Node.header.offset.x,
          y: p.y + Node.header.offset.y
        },
        text: this.options.type,
        zIndex: z,
        fontFamily: Node.header.fontFamily,
        fontSize: Node.header.fontSize,
      });
      t.style({fill: _fashion_fill(this.options.color || Node.style.color)});
      this.stage.d.draw(t);
      this.texts.push(t);
    },
    erase: function() {
      this.body.remove();
      for (var i=0, l=this.texts.length; i<l; i++) {
        this.stage.d.erase(this.texts[i]);
      }
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
        var z = this.zIndex() + 1;
        for (var i=0, l=this.texts.length; i<l; i++) {
          var t = this.texts[i];
          t.position({
            x: pos.x + Node.header.offset.x,
            y: pos.y + Node.header.offset.y
          });
          t.zIndex(z);
        }
      }
    },
    select: function() {
      this.body.hide();
      var z = this.zIndex() + 1;
      for (var i=0, l=this.texts.length; i<l; i++) {
        var t = this.texts[i];
        t.zIndex(z);
      }
      for (var n in this.points) {
        var p = this.points[n];
        p.on_parent_select();
      }
    },
    unselect: function() {
      this.body.show();
      for (var n in this.points) {
        var p = this.points[n];
        p.on_parent_unselect();
      }
    }
  }
});