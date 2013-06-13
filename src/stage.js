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
    hide: function() {
      this.html.hide();
      for (var i=this.elems.length-1; -1<i; i--) {
        if (this.elems[i].body) this.elems[i].body.hide();
      }
    },
    show: function() {
      this.html.show();
      for (var i=this.elems.length-1; -1<i; i--) {
        if (this.elems[i].body) this.elems[i].body.show();
      }
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
      var c = _fashion_color("#FFF");
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
});