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
});