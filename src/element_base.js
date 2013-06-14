var ElementBase = classify('ElementBase', {
  property: {
    d:         null,
    id:        null,
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
      this.id = this.d.id;
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
});